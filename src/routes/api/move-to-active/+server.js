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
		const storageData = await request.json();

		// Validate required fields
		if (!storageData.rentalID) {
			return json(
				{
					success: false,
					error: 'Missing rental ID',
					message: 'rentalID is required to move to active status'
				},
				{ status: 400 }
			);
		}

		// Note: staffName not required for luggage storage

		// Validate storage location (optional but recommended)
		const validStorageAreas = [
			'Area A - Front',
			'Area B - Middle',
			'Area C - Back',
			'Area D - Overflow',
			'Refrigerated Section',
			'Oversized Items',
			'Valuable Items'
		];

		if (storageData.storageLocation && !validStorageAreas.includes(storageData.storageLocation)) {
			return json(
				{
					success: false,
					error: 'Invalid storage location',
					message: `Storage location must be one of: ${validStorageAreas.join(', ')}`,
					validLocations: validStorageAreas
				},
				{ status: 400 }
			);
		}

		const sheets = await getGoogleSheetsClient();

		// 1. 找到對應的紀錄在哪一行並讀取當前資料
		const dataRange = 'Rentals'; // 讀取完整資料以進行驗證
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: dataRange
		});

		const rows = response.data.values || [];
		let rowIndex = -1;
		let currentRental = null;

		for (let i = 1; i < rows.length; i++) {
			if (rows[i][0] === storageData.rentalID) {
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
					success: false,
					error: 'Rental not found',
					message: 'Could not find rental with the specified ID',
					rentalID: storageData.rentalID
				},
				{ status: 404 }
			);
		}
		console.log('--- DEBUGGING currentRental Object ---');
		console.log(currentRental);
		console.log('--- END DEBUGGING ---');
		// Check if rental can be moved to active
		if (currentRental.status !== 'Pending') {
			return json(
				{
					success: false,
					error: 'Status transition not allowed',
					message: `Cannot move rental with status '${currentRental.status}' to Active. Only Pending rentals can be moved to Active.`,
					currentStatus: currentRental.status
				},
				{ status: 409 }
			);
		}

		// Verify this is a luggage storage rental
		if (currentRental.serviceType !== 'Luggage') {
			return json(
				{
					success: false,
					error: 'Invalid service type',
					message: `move-to-active is only for luggage storage. Current service type: ${currentRental.serviceType}`,
					serviceType: currentRental.serviceType
				},
				{ status: 400 }
			);
		}

		// Validate tag number exists (should have been assigned during check-in)
		if (!currentRental.luggageTagNumber) {
			return json(
				{
					success: false,
					error: 'Missing tag number',
					message: 'Luggage tag number is missing. Cannot complete storage without tag assignment.',
					rentalID: storageData.rentalID
				},
				{ status: 400 }
			);
		}

		// 2. 準備要更新的資料
		const updates = {
			status: 'Active',
			storageStaff: '', // No staff tracking for luggage
			storedAt: new Date().toISOString(),
			storageLocation: storageData.storageLocation || '',
			storageNotes: storageData.notes || '',
			itemCondition: storageData.itemCondition || 'Good',
			lastUpdated: new Date().toISOString()
		};

		// Column mapping - standardized across all endpoints
		const columnMap = {
			status: 'B',
			storageStaff: 'Q',
			storedAt: 'R',
			lastUpdated: 'D'
		};

		const updateRequests = [];
		Object.keys(updates).forEach((field) => {
			if (columnMap[field] && updates[field] !== undefined) {
				updateRequests.push({
					range: `Rentals!${columnMap[field]}${rowIndex}`,
					values: [[updates[field]]]
				});
			}
		});

		// 4. 執行更新
		if (updateRequests.length > 0) {
			await sheets.spreadsheets.values.batchUpdate({
				spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
				resource: {
					valueInputOption: 'RAW',
					data: updateRequests
				}
			});
		}

		// Log the storage completion for audit purposes
		console.log(
			`Luggage storage completed: ${storageData.rentalID} - Location: ${storageData.storageLocation || 'Not specified'}`
		);

		// Success response
		return json({
			success: true,
			rentalID: storageData.rentalID,
			message: 'Luggage storage completed successfully',
			storage: {
				previousStatus: 'Pending',
				newStatus: 'Active',
				storageStaff: '', // No staff tracking for luggage
				storedAt: updates.storedAt,
				storageLocation: storageData.storageLocation || 'Not specified',
				tagNumber: currentRental.luggageTagNumber,
				customerName: currentRental.customerName,
				luggageCount: currentRental.luggageCount || 1,
				itemCondition: storageData.itemCondition || 'Good'
			},
			workflow: {
				completed: [
					'Customer registration',
					'Payment and tag assignment',
					'Physical storage completion'
				],
				remaining: ['Customer pickup', 'Final return processing']
			},
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Move-to-Active API Error:', error);

		// Handle different types of errors
		if (error instanceof SyntaxError) {
			return json(
				{
					success: false,
					error: 'Invalid JSON',
					message: 'Request body must be valid JSON'
				},
				{ status: 400 }
			);
		}

		if (error.message && error.message.includes('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64')) {
			return json(
				{
					success: false,
					error: 'Configuration error',
					message: 'Google Sheets authentication is not properly configured'
				},
				{ status: 500 }
			);
		}

		if (error.message && error.message.includes('spreadsheet')) {
			return json(
				{
					success: false,
					error: 'Google Sheets error',
					message: 'Failed to access or update the spreadsheet'
				},
				{ status: 502 }
			);
		}

		// Generic server error
		return json(
			{
				success: false,
				error: 'Internal server error',
				message: 'An unexpected error occurred during storage completion',
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
			success: false,
			error: 'Method not allowed',
			message: 'This endpoint only accepts POST requests',
			usage: {
				method: 'POST',
				description: 'Complete physical luggage storage and move rental to Active status',
				requiredFields: [
					'rentalID (luggage storage rental ID)',
					'staffName (floor staff completing storage)'
				],
				optionalFields: [
					'storageLocation (physical storage area)',
					'notes (storage notes)',
					'tagConfirmed (boolean - tag verification)',
					'itemCondition (condition assessment)'
				],
				validStorageAreas: [
					'Area A - Front',
					'Area B - Middle',
					'Area C - Back',
					'Area D - Overflow',
					'Refrigerated Section',
					'Oversized Items',
					'Valuable Items'
				],
				statusTransition: 'Pending → Active',
				serviceTypeRestriction: 'Luggage storage only',
				workflow: {
					step1: 'Customer registers luggage storage',
					step2: 'Counter staff processes payment and assigns tags',
					step3: 'Status becomes Pending',
					step4: 'Floor staff physically stores items',
					step5: 'This endpoint moves status to Active',
					step6: 'Customer can now pick up items'
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
			success: false,
			error: 'Method not allowed',
			message: 'This endpoint only accepts POST requests'
		},
		{ status: 405 }
	);
}

/** @type {import './$types').RequestHandler} */
export async function DELETE() {
	return json(
		{
			success: false,
			error: 'Method not allowed',
			message: 'This endpoint only accepts POST requests'
		},
		{ status: 405 }
	);
}
