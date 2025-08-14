import { json } from '@sveltejs/kit';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import { env } from '$env/dynamic/private';

// --- 憑證處理 (與 rentals/+server.js 相同) ---
let CREDENTIALS;
try {
	const key_base64 = env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
	if (!key_base64) {
		throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 not found in .env file.');
	}
	const key_json_string = Buffer.from(key_base64, 'base64').toString('utf-8');
	CREDENTIALS = JSON.parse(key_json_string);
} catch (error) {
	console.error('CRITICAL: Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY_BASE64.', error);
	CREDENTIALS = {};
}

// --- Google Sheets 客戶端 (與 rentals/+server.js 相同) ---
async function getGoogleSheetsClient() {
	const auth = new GoogleAuth({
		credentials: CREDENTIALS,
		scopes: ['https://www.googleapis.com/auth/spreadsheets']
	});
	const authClient = await auth.getClient();
	return google.sheets({ version: 'v4', auth: authClient });
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		// Parse the incoming request body
		const returnData = await request.json();

		// Validate required fields
		if (!returnData.rentalID) {
			return json(
				{
					error: 'Missing rental ID',
					message: 'rentalID is required to process return'
				},
				{ status: 400 }
			);
		}

		if (!returnData.returnStaff) {
			return json(
				{
					error: 'Missing staff information',
					message: 'returnStaff is required for return processing'
				},
				{ status: 400 }
			);
		}

		// Note: goodCondition is a boolean, no validation needed for specific values

		// First, get the current rental to validate return is allowed
		const sheets = await getGoogleSheetsClient();
		
		const dataRange = 'Rentals';
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: dataRange
		});

		const rows = response.data.values || [];
		let rowIndex = -1;
		let currentRental = null;

		for (let i = 1; i < rows.length; i++) {
			if (rows[i][0] === returnData.rentalID) {
				rowIndex = i + 1;
				const headers = rows[0];
				currentRental = {};
				headers.forEach((header, index) => {
					currentRental[header] = rows[i][index] || '';
				});
				break;
			}
		}

		if (rowIndex === -1 || !currentRental) {
			return json(
				{
					error: 'Rental not found',
					message: `Could not find rental with ID: ${returnData.rentalID}`,
					rentalID: returnData.rentalID
				},
				{ status: 404 }
			);
		}

		// Check if rental can be returned
		if (currentRental.status !== 'Active') {
			return json(
				{
					error: 'Return not allowed',
					message: `Cannot process return for rental with status '${currentRental.status}'. Only Active rentals can be returned.`,
					currentStatus: currentRental.status
				},
				{ status: 409 }
			);
		}

		// Calculate if return is late
		const now = new Date();
		const expectedReturn = new Date(currentRental.expectedReturn);
		const isLate = now > expectedReturn;
		const minutesLate = isLate ? Math.ceil((now - expectedReturn) / (1000 * 60)) : 0;

		// Calculate late fees for bike rentals (30min increments, ¥500 each)
		let lateFee = 0;
		if (isLate && currentRental.serviceType === 'Bike') {
			const thirtyMinIncrements = Math.ceil(minutesLate / 30);
			lateFee = thirtyMinIncrements * 500;
		}

		// Determine final status based on service type
		const finalStatus =
			currentRental.serviceType === 'Luggage' ? 'Closed (Picked Up)' : 'Closed';

		// Service-specific validation and resource release
		const serviceType = currentRental.serviceType;
		let resourceReleaseData = {};

		if (serviceType === 'Bike') {
			// Validate bikes are being returned
			if (returnData.bikeNumbers && returnData.bikeNumbers.length > 0) {
				const assignedBikes = currentRental.bikeNumber
					? currentRental.bikeNumber.split(', ')
					: [];
				const returningBikes = returnData.bikeNumbers;

				// Check if all assigned bikes are being returned
				const missingBikes = assignedBikes.filter((bike) => !returningBikes.includes(bike));
				if (missingBikes.length > 0) {
					return json(
						{
							error: 'Incomplete bike return',
							message: `Missing bikes: ${missingBikes.join(', ')}`,
							assignedBikes,
							returningBikes,
							missingBikes
						},
						{ status: 400 }
					);
				}

				resourceReleaseData.bikesReturned = returningBikes;
			}
		} else if (serviceType === 'Onsen') {
			// Validate onsen keys are being returned
			if (returnData.onsenKeyNumbers && returnData.onsenKeyNumbers.length > 0) {
				const assignedKeys = currentRental.onsenKeyNumber
					? currentRental.onsenKeyNumber.split(', ')
					: [];
				const returningKeys = returnData.onsenKeyNumbers;

				// Check if all assigned keys are being returned
				const missingKeys = assignedKeys.filter((key) => !returningKeys.includes(key));
				if (missingKeys.length > 0) {
					return json(
						{
							error: 'Incomplete key return',
							message: `Missing onsen keys: ${missingKeys.join(', ')}`,
							assignedKeys,
							returningKeys,
							missingKeys
						},
						{ status: 400 }
					);
				}

				resourceReleaseData.keysReturned = returningKeys;
			}
		} else if (serviceType === 'Luggage') {
			// For luggage, verify customer identity or pickup authorization
			if (!returnData.customerVerified) {
				return json(
					{
						error: 'Customer verification required',
						message: 'Customer identity must be verified before luggage pickup'
					},
					{ status: 400 }
				);
			}

			resourceReleaseData.luggagePickedUp = true;
			resourceReleaseData.pickupAuthorized = returnData.customerVerified;
		}

		// Prepare data for Google Sheets update
		const updates = {
			status: finalStatus,
			returnStaff: returnData.returnStaff,
			returnedAt: new Date().toISOString(),
			goodCondition: returnData.goodCondition ? 'TRUE' : 'FALSE',
			returnNotes: returnData.returnNotes || '',
			isLate: isLate ? 'TRUE' : 'FALSE',
			minutesLate: minutesLate,
			damageReported: returnData.goodCondition ? 'FALSE' : 'TRUE', // If not good condition, mark as damage reported
			repairRequired: returnData.repairRequired ? 'TRUE' : 'FALSE',
			replacementRequired: false, // Since we only have goodCondition, not missing items
			lastUpdated: new Date().toISOString()
		};

		// Column mapping - standardized across all endpoints
		const columnMap = {
			status: 'B',
			returnStaff: 'T',
			returnedAt: 'S',
			goodCondition: 'U',
			returnNotes: 'V',
			isLate: 'W',
			minutesLate: 'X',
			damageReported: 'AA',
			repairRequired: 'AB',
			replacementRequired: 'AC',
			lastUpdated: 'D'
		};

		// Build batch update requests
		const updateRequests = [];
		Object.keys(updates).forEach((field) => {
			if (columnMap[field] && updates[field] !== undefined) {
				updateRequests.push({
					range: `Rentals!${columnMap[field]}${rowIndex}`,
					values: [[updates[field]]]
				});
			}
		});

		// Execute the update
		if (updateRequests.length > 0) {
			await sheets.spreadsheets.values.batchUpdate({
				spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
				resource: {
					valueInputOption: 'RAW',
					data: updateRequests
				}
			});
		}

		// Log the return for audit purposes
		const serviceLabel = serviceType === 'Luggage' ? 'pickup' : 'return';
		console.log(
			`${serviceType} ${serviceLabel} processed: ${returnData.rentalID} by ${returnData.returnStaff} - Condition: ${returnData.goodCondition ? 'Good' : 'Issues reported'} - Late fee: ¥${lateFee}`
		);

		// Prepare service-specific response messages
		let serviceMessage = '';
		if (serviceType === 'Bike') {
			serviceMessage =
				lateFee > 0
					? `Bike return completed with late fee of ¥${lateFee.toLocaleString()}`
					: 'Bike return completed successfully';
		} else if (serviceType === 'Onsen') {
			serviceMessage = 'Onsen pass return completed successfully';
		} else if (serviceType === 'Luggage') {
			serviceMessage = 'Luggage pickup completed successfully';
		}

		// Success response
		return json({
			success: true,
			rentalID: returnData.rentalID,
			message: serviceMessage,
			return: {
				serviceType,
				previousStatus: 'Active',
				newStatus: finalStatus,
				returnStaff: returnData.returnStaff,
				returnedAt: updates.returnedAt,
				goodCondition: returnData.goodCondition,
				returnNotes: returnData.returnNotes,
				customerName: currentRental.customerName,
				isLate,
				...(minutesLate > 0 && { minutesLate }),
				...(lateFee > 0 && { lateFee }),
				...resourceReleaseData
			},
			...(lateFee > 0 && {
				billing: {
					originalPrice: currentRental.totalPrice,
					lateFee,
					totalDue: Number(currentRental.totalPrice || 0) + lateFee
				}
			}),
			workflow: {
				completed: [
					'Customer registration',
					'Check-in and resource assignment',
					'Service delivery',
					'Return/pickup processing'
				],
				status: 'Rental lifecycle completed'
			},
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Return API Error:', error);

		// Handle different types of errors
		if (error instanceof SyntaxError) {
			return json(
				{
					error: 'Invalid JSON',
					message: 'Request body must be valid JSON'
				},
				{ status: 400 }
			);
		}

		if (error.name === 'TypeError' && error.message.includes('fetch')) {
			return json(
				{
					error: 'Network error',
					message: 'Failed to connect to Google Apps Script'
				},
				{ status: 503 }
			);
		}

		// Generic server error
		return json(
			{
				error: 'Internal server error',
				message: 'An unexpected error occurred during return processing',
				details: error.message
			},
			{ status: 500 }
		);
	}
}

// Handle unsupported methods
/** @type {import('./$types').RequestHandler} */
export async function GET() {
	return json(
		{
			error: 'Method not allowed',
			message: 'This endpoint only accepts POST requests',
			usage: {
				method: 'POST',
				description: 'Process returns/pickups from Active rental status',
				requiredFields: [
					'rentalID (active rental to return)',
					'returnStaff (staff processing return)'
				],
				conditionalFields: {
					Bike: ['bikeNumbers (array of bikes being returned)'],
					Onsen: ['onsenKeyNumbers (array of keys being returned)'],
					Luggage: ['customerVerified (boolean - identity confirmed)']
				},
				optionalFields: [
					'goodCondition (boolean - true if item in good condition)',
					'returnNotes (return notes)',
					'customerVerified (for luggage pickup)'
				],
				lateFeeCalculation: {
					Bike: '¥500 per 30-minute increment after expected return',
					Onsen: 'No late fees',
					Luggage: 'No late fees'
				},
				statusTransitions: {
					Bike: 'Active → Closed',
					Onsen: 'Active → Closed',
					Luggage: 'Active → Closed (Picked Up)'
				},
				resourceRelease: 'Bikes and onsen keys become available for new rentals'
			}
		},
		{ status: 405 }
	);
}

/** @type {import('./$types').RequestHandler} */
export async function PUT() {
	return json(
		{
			error: 'Method not allowed',
			message: 'This endpoint only accepts POST requests'
		},
		{ status: 405 }
	);
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE() {
	return json(
		{
			error: 'Method not allowed',
			message: 'This endpoint only accepts POST requests'
		},
		{ status: 405 }
	);
}
