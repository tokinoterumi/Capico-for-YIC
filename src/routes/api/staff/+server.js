import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getGoogleSheetsClient } from '$utils/google-sheets-client';
import { handleApiError } from '$utils/api-error-handler';

function generateStaffId() {
	return 'STAFF_' + Date.now().toString();
}

/** @type {import('./$types').RequestHandler} */
export async function GET() {
	try {
		const sheets = await getGoogleSheetsClient();

		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: 'Staff!A:D'
		});

		const rows = response.data.values || [];
		if (rows.length <= 1) {
			return json({
				success: true,
				staff: [],
				total: 0,
				timestamp: new Date().toISOString()
			});
		}

		const headers = rows[0];
		const staff = [];

		for (let i = 1; i < rows.length; i++) {
			const staffMember = {};
			headers.forEach((header, index) => {
				staffMember[header] = rows[i][index] || '';
			});
			staff.push(staffMember);
		}

		return json({
			success: true,
			staff,
			total: staff.length,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return handleApiError(error, 'GET Staff API');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const data = await request.json();
		const sheets = await getGoogleSheetsClient();

		if (!data.name?.trim()) {
			return json(
				{
					success: false,
					error: 'Staff name is required'
				},
				{ status: 400 }
			);
		}

		const staffId = generateStaffId();
		const currentTime = new Date().toISOString();

		// Get current staff count to set order
		const existingResponse = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: 'Staff!A:D'
		});
		const existingRows = existingResponse.data.values || [];
		const newOrder = Math.max(0, existingRows.length - 1);

		const rowData = [
			staffId,
			data.name.trim(),
			currentTime,
			newOrder.toString()
		];

		await sheets.spreadsheets.values.append({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: 'Staff!A:D',
			valueInputOption: 'RAW',
			resource: {
				values: [rowData]
			}
		});

		return json({
			success: true,
			staffId,
			name: data.name,
			message: 'Staff member added successfully',
			timestamp: currentTime
		}, { status: 201 });
	} catch (error) {
		return handleApiError(error, 'POST Staff API');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ request }) {
	try {
		const updateData = await request.json();
		const sheets = await getGoogleSheetsClient();

		if (!updateData.id) {
			return json(
				{
					success: false,
					error: 'Missing staff ID'
				},
				{ status: 400 }
			);
		}

		if (!updateData.name?.trim()) {
			return json(
				{
					success: false,
					error: 'Staff name is required'
				},
				{ status: 400 }
			);
		}

		// Find the row with the staff ID
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: 'Staff!A:D'
		});

		const rows = response.data.values || [];
		let rowIndex = -1;

		for (let i = 1; i < rows.length; i++) {
			if (rows[i][0] === updateData.id) {
				rowIndex = i + 1;
				break;
			}
		}

		if (rowIndex === -1) {
			return json(
				{
					success: false,
					error: 'Staff member not found'
				},
				{ status: 404 }
			);
		}

		// Update the staff member
		const updateRequests = [
			{
				range: `Staff!B${rowIndex}`,
				values: [[updateData.name.trim()]]
			},
			{
				range: `Staff!C${rowIndex}`,
				values: [[new Date().toISOString()]]
			}
		];

		await sheets.spreadsheets.values.batchUpdate({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			resource: {
				valueInputOption: 'RAW',
				data: updateRequests
			}
		});

		return json({
			success: true,
			staffId: updateData.id,
			name: updateData.name,
			message: 'Staff member updated successfully',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return handleApiError(error, 'PUT Staff API');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ url }) {
	try {
		const staffId = url.searchParams.get('id');
		const sheets = await getGoogleSheetsClient();

		if (!staffId) {
			return json(
				{
					success: false,
					error: 'Missing staff ID'
				},
				{ status: 400 }
			);
		}

		// Get spreadsheet metadata to find the correct sheet ID
		const spreadsheetResponse = await sheets.spreadsheets.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID
		});

		const staffSheet = spreadsheetResponse.data.sheets?.find(
			sheet => sheet.properties?.title === 'Staff'
		);

		if (!staffSheet || !staffSheet.properties) {
			return json(
				{
					success: false,
					error: 'Staff sheet not found'
				},
				{ status: 500 }
			);
		}

		const sheetId = staffSheet.properties.sheetId;

		// Find the row with the staff ID
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: 'Staff!A:D'
		});

		const rows = response.data.values || [];
		let rowIndex = -1;
		let staffData = null;

		for (let i = 1; i < rows.length; i++) {
			if (rows[i][0] === staffId) {
				rowIndex = i + 1;
				staffData = rows[i];
				break;
			}
		}

		if (rowIndex === -1) {
			return json(
				{
					success: false,
					error: 'Staff member not found'
				},
				{ status: 404 }
			);
		}

		// Delete the row
		await sheets.spreadsheets.batchUpdate({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			resource: {
				requests: [
					{
						deleteDimension: {
							range: {
								sheetId: sheetId,
								dimension: 'ROWS',
								startIndex: rowIndex - 1,
								endIndex: rowIndex
							}
						}
					}
				]
			}
		});

		console.log(`DELETION: Staff member ${staffId} deleted - Name: ${staffData[1]}`);

		return json({
			success: true,
			staffId,
			message: 'Staff member deleted successfully',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return handleApiError(error, 'DELETE Staff API');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PATCH({ request }) {
	try {
		const { orderedStaff } = await request.json();
		const sheets = await getGoogleSheetsClient();

		if (!orderedStaff || !Array.isArray(orderedStaff)) {
			return json(
				{
					success: false,
					error: 'Invalid ordered staff data'
				},
				{ status: 400 }
			);
		}

		// Get all current staff data
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: 'Staff!A:D'
		});

		const rows = response.data.values || [];
		if (rows.length <= 1) {
			return json(
				{
					success: false,
					error: 'No staff data found'
				},
				{ status: 404 }
			);
		}

		// Clear the existing data (except headers)
		if (rows.length > 1) {
			await sheets.spreadsheets.values.clear({
				spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
				range: `Staff!A2:D${rows.length}`
			});
		}

		// Prepare new data with updated order
		const newRows = orderedStaff.map(member => [
			member.id,
			member.name,
			member.lastUpdated,
			member.order.toString()
		]);

		// Write the reordered data
		await sheets.spreadsheets.values.batchUpdate({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			resource: {
				valueInputOption: 'RAW',
				data: [{
					range: 'Staff!A2:D',
					values: newRows
				}]
			}
		});

		return json({
			success: true,
			message: 'Staff order updated successfully',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return handleApiError(error, 'PATCH Staff API');
	}
}