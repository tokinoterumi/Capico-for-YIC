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
		const resolveData = await request.json();

		// Validate required fields
		if (!resolveData.rentalID) {
			return json(
				{
					success: false,
					error: 'Missing rental ID',
					message: 'rentalID is required to resolve trouble'
				},
				{ status: 400 }
			);
		}


		const sheets = await getGoogleSheetsClient();

		// 1. 找到對應的紀錄在哪一行並讀取當前資料
		const dataRange = 'Rentals';
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: dataRange
		});

		const rows = response.data.values || [];
		let rowIndex = -1;
		let currentRental = null;

		for (let i = 1; i < rows.length; i++) {
			if (rows[i][0] === resolveData.rentalID) {
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
					rentalID: resolveData.rentalID
				},
				{ status: 404 }
			);
		}

		// Check if rental can be resolved
		if (currentRental.status !== 'Troubled') {
			return json(
				{
					success: false,
					error: 'Status transition not allowed',
					message: `Cannot resolve rental with status '${currentRental.status}'. Only Troubled rentals can be resolved.`,
					currentStatus: currentRental.status
				},
				{ status: 409 }
			);
		}

		// Prepare data for Google Sheets update
		const updates = {
			status: 'Active', // Return to Active status after resolving trouble
			troubleResolved: 'TRUE',
			lastUpdated: new Date().toISOString()
		};

		// Column mapping - standardized across all endpoints
		const columnMap = {
			status: 'B',
			troubleResolved: 'Z',
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

		// Log the resolution for audit purposes
		console.log(
			`Trouble resolved: ${resolveData.rentalID} - Resolution: ${resolveData.notes || 'トラブル解決済み'}`
		);

		// Success response
		return json({
			success: true,
			rentalID: resolveData.rentalID,
			message: 'Trouble resolved successfully',
			resolution: {
				previousStatus: 'Troubled',
				newStatus: 'Active',
				resolvedAt: updates.troubleResolvedAt,
				customerName: currentRental.customerName,
				serviceType: currentRental.serviceType,
				resolutionNotes: resolveData.notes || 'トラブル解決済み'
			},
			workflow: {
				completed: [
					'Customer registration',
					'Service activation',
					'Trouble reporting',
					'Trouble resolution'
				],
				remaining: ['Service completion', 'Return/pickup processing']
			},
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Resolve-Trouble API Error:', error);

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
				message: 'An unexpected error occurred during trouble resolution',
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
				description: 'Resolve trouble status and return rental to Active status',
				requiredFields: [
					'rentalID (troubled rental ID)'
				],
				optionalFields: [
					'notes (resolution notes)'
				],
				statusTransition: 'Troubled → Active',
				workflow: {
					step1: 'Rental becomes troubled due to issues',
					step2: 'Staff investigates and resolves the problem',
					step3: 'This endpoint moves status back to Active',
					step4: 'Customer can continue using the service'
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

/** @type {import('./$types').RequestHandler} */
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