import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

// --- Credentials handling ---
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
	CREDENTIALS = {}; // Use empty object to avoid server complete crash
}

async function getGoogleSheetsClient() {
	const auth = new GoogleAuth({
		credentials: CREDENTIALS,
		scopes: ['https://www.googleapis.com/auth/spreadsheets']
	});

	const authClient = await auth.getClient();
	return google.sheets({ version: 'v4', auth: authClient });
}

async function fetchRentalData(rentalID) {
	try {
		const sheets = await getGoogleSheetsClient();
		
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: 'Rentals!A:AP'
		});

		const rows = response.data.values || [];
		if (rows.length <= 1) {
			return null;
		}

		const headers = rows[0];
		
		for (let i = 1; i < rows.length; i++) {
			if (rows[i][0] === rentalID) {
				const rental = {};
				headers.forEach((header, index) => {
					rental[header] = rows[i][index] || '';
				});
				return rental;
			}
		}
		
		return null;
	} catch (error) {
		console.error('Error fetching rental data:', error);
		throw error;
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		// Parse the incoming request body
		const checkinData = await request.json();

		// Validate required fields
		if (!checkinData.rentalID) {
			return json(
				{
					error: 'Missing rental ID',
					message: 'rentalID is required for check-in'
				},
				{ status: 400 }
			);
		}

		// Fetch actual rental data from database
		const rentalData = await fetchRentalData(checkinData.rentalID);
		
		if (!rentalData) {
			return json(
				{
					error: 'Rental not found',
					message: `No rental found with ID: ${checkinData.rentalID}`
				},
				{ status: 404 }
			);
		}

		// Get service type from actual rental data
		const serviceType = rentalData.serviceType || 'Luggage';

		// Staff name only required for non-Luggage services
		if (serviceType !== 'Luggage' && !checkinData.staffName) {
			return json(
				{
					error: 'Missing staff information',
					message: 'staffName is required for check-in'
				},
				{ status: 400 }
			);
		}

		// Validate ID photo data (only required for non-Luggage services)
		const photoRequired = serviceType !== 'Luggage';

		if (photoRequired && (!checkinData.photoData || !checkinData.photoFileName)) {
			return json(
				{
					error: 'Missing ID photo',
					message: 'photoData and photoFileName are required for check-in'
				},
				{ status: 400 }
			);
		}

		// Validate photo format (only if photo is provided)
		if (checkinData.photoData) {
			const validPhotoFormats = ['image/jpeg', 'image/jpg', 'image/png'];
			if (!checkinData.photoMimeType || !validPhotoFormats.includes(checkinData.photoMimeType)) {
				return json(
					{
						error: 'Invalid photo format',
						message: `Photo must be JPEG or PNG format. Received: ${checkinData.photoMimeType}`,
						validFormats: validPhotoFormats
					},
					{ status: 400 }
				);
			}
		}

		// Validate rental status - only Pending rentals can be checked in
		if (rentalData.status !== 'Pending') {
			return json(
				{
					error: 'Invalid rental status',
					message: `Rental ${checkinData.rentalID} has status '${rentalData.status}' and cannot be checked in. Only 'Pending' rentals can be checked in.`,
					currentStatus: rentalData.status
				},
				{ status: 400 }
			);
		}

		// Prepare resource assignment data
		const resourceData = {
			nextStatus: '',
			bikeNumber: '',
			onsenKeyNumber: '',
			luggageTagNumbers: []
		};

		// Service-specific resource validation and assignment
		if (serviceType === 'Bike') {
			if (!checkinData.bikeNumbers || checkinData.bikeNumbers.length === 0) {
				return json(
					{
						error: 'Missing bike assignment',
						message: 'bikeNumbers array is required for bike rentals'
					},
					{ status: 400 }
				);
			}

			// Validate bike count against rental data
			const expectedBikeCount = parseInt(rentalData.bikeCount || '0');
			if (checkinData.bikeNumbers.length !== expectedBikeCount) {
				return json(
					{
						error: 'Bike count mismatch',
						message: `Expected ${expectedBikeCount} bikes but received ${checkinData.bikeNumbers.length} bike numbers`,
						expectedCount: expectedBikeCount,
						receivedCount: checkinData.bikeNumbers.length
					},
					{ status: 400 }
				);
			}

			resourceData.bikeNumber = checkinData.bikeNumbers.join(', ');
			resourceData.nextStatus = 'Active';
		} else if (serviceType === 'Onsen') {
			if (!checkinData.onsenKeyNumbers || checkinData.onsenKeyNumbers.length === 0) {
				return json(
					{
						error: 'Missing onsen key assignment',
						message: 'onsenKeyNumbers array is required for onsen passes'
					},
					{ status: 400 }
				);
			}

			// Onsen keys are manually assigned to groups - no strict validation needed
			// Just ensure at least one key is provided for the group

			resourceData.onsenKeyNumber = checkinData.onsenKeyNumbers.join(', ');
			resourceData.nextStatus = 'Active';
		} else if (serviceType === 'Luggage') {
			if (!checkinData.luggageTagNumbers || checkinData.luggageTagNumbers.length === 0) {
				return json(
					{
						error: 'Missing luggage tag numbers',
						message: 'luggageTagNumbers is required for luggage storage check-in'
					},
					{ status: 400 }
				);
			}

			resourceData.luggageTagNumbers = checkinData.luggageTagNumbers;
			resourceData.nextStatus = 'Awaiting_Storage'; // Luggage goes to awaiting storage first
		}

		// Upload photo to Google Apps Script (if photo exists)
		let photoFileId = null;
		if (checkinData.photoData && checkinData.photoFileName) {
			const gasPayload = {
				action: 'uploadPhoto',
				photoData: checkinData.photoData,
				fileName: checkinData.photoFileName
			};

			const gasResponse = await fetch(env.GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(gasPayload)
			});

			if (!gasResponse.ok) {
				const errorText = await gasResponse.text();
				console.error('Google Apps Script photo upload error:', errorText);

				return json(
					{
						error: 'Photo upload failed',
						message: 'Failed to upload photo to Google Apps Script',
						details: errorText
					},
					{ status: 502 }
				);
			}

			const gasResult = await gasResponse.json();

			// Check if Google Apps Script returned an error
			if (!gasResult.success) {
				console.error('Google Apps Script photo upload error:', gasResult.error);

				return json(
					{
						error: 'Photo upload failed',
						message: gasResult.error || 'Failed to upload photo',
						details: gasResult.details || 'No additional details'
					},
					{ status: 500 }
				);
			}

			photoFileId = gasResult.fileId;
		}

		// Update rental record in Google Sheets
		try {
			const sheets = await getGoogleSheetsClient();

			// Get current data to find the row
			const response = await sheets.spreadsheets.values.get({
				spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
				range: 'Rentals!A:A'
			});

			const rows = response.data.values || [];
			let rowIndex = -1;

			for (let i = 1; i < rows.length; i++) {
				if (rows[i][0] === checkinData.rentalID) {
					rowIndex = i + 1; // +1 because sheets are 1-indexed
					break;
				}
			}

			if (rowIndex === -1) {
				console.error(`Rental ${checkinData.rentalID} not found in spreadsheet`);
				return json(
					{
						success: false,
						error: 'Rental not found',
						message: 'Could not find rental record to update'
					},
					{ status: 404 }
				);
			}

			// Column mapping for updates (same as rentals endpoint)
			const columnMap = {
				// Basic info
				status: 'B',
				lastUpdated: 'D',

				// Check-in related
				checkInStaff: 'M',
				checkedInAt: 'N',
				photoFileID: 'O',
				verified: 'P',

				// Service-specific details
				bikeNumber: 'AE',
				onsenKeyNumber: 'AF',
				luggageTagNumber: 'AH'
			};

			// Prepare updates
			const updates = {
				status: resourceData.nextStatus,
				checkInStaff: serviceType !== 'Luggage' ? checkinData.staffName : 'System',
				checkedInAt: new Date().toISOString(),
				lastUpdated: new Date().toISOString(),
				verified: checkinData.verified ? 'TRUE' : 'FALSE'
			};

			// Add photo file ID if uploaded
			if (photoFileId) {
				updates.photoFileID = photoFileId;
			}

			// Add service-specific resource assignments
			if (serviceType === 'Bike' && resourceData.bikeNumber) {
				updates.bikeNumber = resourceData.bikeNumber;
			} else if (serviceType === 'Onsen' && resourceData.onsenKeyNumber) {
				updates.onsenKeyNumber = resourceData.onsenKeyNumber;
			} else if (
				serviceType === 'Luggage' &&
				resourceData.luggageTagNumbers &&
				resourceData.luggageTagNumbers.length > 0
			) {
				updates.luggageTagNumber = resourceData.luggageTagNumbers.join(', ');
			}

			// Apply updates to Google Sheets
			const updateRequests = [];
			Object.keys(updates).forEach((field) => {
				if (columnMap[field] && updates[field] !== undefined) {
					updateRequests.push({
						range: `Rentals!${columnMap[field]}${rowIndex}`,
						values: [[updates[field]]]
					});
				}
			});

			if (updateRequests.length > 0) {
				await sheets.spreadsheets.values.batchUpdate({
					spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
					resource: {
						valueInputOption: 'RAW',
						data: updateRequests
					}
				});
			}

			console.log(
				`Successfully updated rental ${checkinData.rentalID} in Google Sheets - Status: ${resourceData.nextStatus}`
			);
		} catch (sheetsError) {
			console.error('Google Sheets update error:', sheetsError);
			return json(
				{
					success: false,
					error: 'Database update failed',
					message: 'Check-in processed but failed to update rental record',
					details: sheetsError.message
				},
				{ status: 500 }
			);
		}

		// Log the check-in for audit purposes
		const staffInfo = serviceType !== 'Luggage' ? checkinData.staffName : 'System (Luggage)';
		console.log(
			`Rental ${checkinData.rentalID} checked in by ${staffInfo} - Service: ${serviceType}, Status: ${resourceData.nextStatus}`
		);

		// Success response with different messages based on service type
		const responseMessage =
			serviceType === 'Luggage'
				? 'Check-in completed. Rental moved to storage queue.'
				: 'Check-in completed. Rental is now active.';

		return json({
			success: true,
			rentalID: checkinData.rentalID,
			message: responseMessage,
			checkin: {
				staffName: serviceType !== 'Luggage' ? checkinData.staffName : 'System',
				checkedInAt: new Date().toISOString(),
				newStatus: resourceData.nextStatus,
				serviceType: serviceType,
				photoUploaded: !!photoFileId,
				photoFileId: photoFileId,
				...(resourceData.bikeNumber && { bikeNumbers: checkinData.bikeNumbers }),
				...(resourceData.onsenKeyNumber && { onsenKeyNumbers: checkinData.onsenKeyNumbers }),
				...(resourceData.luggageTagNumbers &&
					resourceData.luggageTagNumbers.length > 0 && {
						luggageTagNumbers: checkinData.luggageTagNumbers
					})
			},
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Check-in API Error:', error);

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
				message: 'An unexpected error occurred during check-in',
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
				requiredFields: ['rentalID', 'staffName', 'photoData', 'photoFileName', 'photoMimeType'],
				serviceSpecificFields: {
					Bike: ['bikeNumbers (array)'],
					Onsen: ['onsenKeyNumbers (array)'],
					Luggage: ['luggageTagNumbers (array of strings)']
				},
				optionalFields: ['notes', 'customerPresent', 'verified'],
				photoFormats: ['image/jpeg', 'image/png'],
				statusTransitions: {
					Bike: 'Pending → Active',
					Onsen: 'Pending → Active',
					Luggage: 'Pending → Awaiting_Storage'
				}
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
