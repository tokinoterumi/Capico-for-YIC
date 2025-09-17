import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { updateSheetsRow, findRentalRow } from '$utils/sheets-updater';
import { handleApiError, handleMethodNotAllowed } from '$utils/api-error-handler';
import { getGoogleSheetsClient } from '$utils/google-sheets-client';

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
		const rentalData = await findRentalRow(sheets, env.GOOGLE_SPREADSHEET_ID, storageData.rentalID);

		if (!rentalData) {
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

		const { rowIndex, currentRental } = rentalData;

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

		// 4. 執行更新
		await updateSheetsRow(sheets, env.GOOGLE_SPREADSHEET_ID, updates, columnMap, rowIndex);

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
		return handleApiError(error, 'Move-to-Active API');
	}
}

// Handle unsupported methods
/** @type {import('./$types').RequestHandler} */
export async function GET() {
	return handleMethodNotAllowed('POST', 'Complete physical luggage storage and move rental to Active status');
}

/** @type {import('./$types').RequestHandler} */
export async function PUT() {
	return handleMethodNotAllowed('POST');
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE() {
	return handleMethodNotAllowed('POST');
}
