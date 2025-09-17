import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getGoogleSheetsClient } from '$utils/google-sheets-client';
import { findRentalRow } from '$utils/sheets-updater';
import { handleApiError, handleMethodNotAllowed } from '$utils/api-error-handler';

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

		// Find rental using shared utility
		const rentalData = await findRentalRow(sheets, env.GOOGLE_SPREADSHEET_ID, resolveData.rentalID);

		if (!rentalData) {
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

		const { rowIndex, currentRental } = rentalData;

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
			status: 'Closed', // Change to Closed status after resolving trouble
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
				newStatus: 'Closed',
				resolvedAt: updates.lastUpdated,
				customerName: currentRental.customerName,
				serviceType: currentRental.serviceType,
				resolutionNotes: resolveData.notes || 'トラブル解決済み'
			},
			workflow: {
				completed: [
					'Customer registration',
					'Service activation',
					'Trouble reporting',
					'Trouble resolution',
					'Service completion'
				],
				remaining: []
			},
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return handleApiError(error, 'Resolve-Trouble API');
	}
}

// Handle unsupported methods
/** @type {import('./$types').RequestHandler} */
export async function GET() {
	return handleMethodNotAllowed('POST', 'Resolve trouble status and close rental');
}

/** @type {import('./$types').RequestHandler} */
export async function PUT() {
	return handleMethodNotAllowed('POST');
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE() {
	return handleMethodNotAllowed('POST');
}