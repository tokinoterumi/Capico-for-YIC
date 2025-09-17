/**
 * Utility functions for Google Sheets updates
 * Reduces code duplication across API endpoints
 */

/**
 * Update Google Sheets with batch operations
 * @param {Object} sheets - Google Sheets client instance
 * @param {string} spreadsheetId - The Google Spreadsheet ID
 * @param {Object} updates - Object with field names as keys and values to update
 * @param {Object} columnMap - Object mapping field names to column letters
 * @param {number} rowIndex - Row number to update (1-based)
 * @param {string} sheetName - Sheet name (default: 'Rentals')
 * @returns {Promise<boolean>} - Returns true if update was successful
 */
export async function updateSheetsRow(
	sheets,
	spreadsheetId,
	updates,
	columnMap,
	rowIndex,
	sheetName = 'Rentals'
) {
	const updateRequests = [];

	Object.keys(updates).forEach((field) => {
		if (columnMap[field] && updates[field] !== undefined) {
			updateRequests.push({
				range: `${sheetName}!${columnMap[field]}${rowIndex}`,
				values: [[updates[field]]]
			});
		}
	});

	if (updateRequests.length > 0) {
		await sheets.spreadsheets.values.batchUpdate({
			spreadsheetId,
			resource: {
				valueInputOption: 'RAW',
				data: updateRequests
			}
		});
		return true;
	}

	return false;
}

/**
 * Find a rental row by ID in the spreadsheet
 * @param {Object} sheets - Google Sheets client instance
 * @param {string} spreadsheetId - The Google Spreadsheet ID
 * @param {string} rentalID - The rental ID to find
 * @param {string} sheetName - Sheet name (default: 'Rentals')
 * @returns {Promise<{rowIndex: number, currentRental: Object} | null>}
 */
export async function findRentalRow(sheets, spreadsheetId, rentalID, sheetName = 'Rentals') {
	const response = await sheets.spreadsheets.values.get({
		spreadsheetId,
		range: sheetName
	});

	const rows = response.data.values || [];

	for (let i = 1; i < rows.length; i++) {
		if (rows[i][0] === rentalID) {
			const headers = rows[0];
			const currentRental = {};
			headers.forEach((header, index) => {
				currentRental[header] = rows[i][index] || '';
			});

			return {
				rowIndex: i + 1, // 1-based row number
				currentRental
			};
		}
	}

	return null;
}