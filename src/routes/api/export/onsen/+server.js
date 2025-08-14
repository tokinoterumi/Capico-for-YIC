import { json } from '@sveltejs/kit';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import { env } from '$env/dynamic/private';
import * as XLSX from 'xlsx';

// --- 憑証処理 ---
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

async function getGoogleSheetsClient() {
	const auth = new GoogleAuth({
		credentials: CREDENTIALS,
		scopes: ['https://www.googleapis.com/auth/spreadsheets']
	});

	const authClient = await auth.getClient();
	return google.sheets({ version: 'v4', auth: authClient });
}

// Column mapping to Japanese headers
const COLUMN_MAPPING = {
	rentalID: '予約番号',
	customerName: 'お客様名',
	customerContact: '連絡先',
	totalPrice: '料金',
	discountApplied: '割引適用',
	unavailableBaths: '利用不可浴場',
	companion: '同行者',
	comeFrom: 'お住まい',
	totalAdultCount: '大人',
	totalChildCount: '小人',
	adultMaleCount: '男性',
	adultFemaleCount: '女性',
	childMaleCount: '男の子',
	childFemaleCount: '女の子',
	faceTowelCount: 'フェイスタオル',
	bathTowelCount: 'バスタオル',
	checkInStaff: '担当',
	checkedInAt: '日時'
};

// Fields to include in export
const EXPORT_FIELDS = [
	'rentalID',
	'customerName',
	'customerContact',
	'totalPrice',
	'discountApplied',
	'unavailableBaths',
	'companion',
	'comeFrom',
	'totalAdultCount',
	'totalChildCount',
	'adultMaleCount',
	'adultFemaleCount',
	'childMaleCount',
	'childFemaleCount',
	'faceTowelCount',
	'bathTowelCount',
	'checkInStaff',
	'checkedInAt'
];

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const sheets = await getGoogleSheetsClient();

		// Parse query parameters for date filtering
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');

		// Get all rental data
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: 'Rentals!A:AR'
		});

		const rows = response.data.values || [];
		if (rows.length <= 1) {
			return json(
				{
					success: false,
					error: 'No data found',
					message: 'No rental data available for export'
				},
				{ status: 404 }
			);
		}

		const headers = rows[0];
		let onsenRentals = [];

		// Convert rows to objects and filter for Onsen service only
		for (let i = 1; i < rows.length; i++) {
			const rental = {};
			headers.forEach((header, index) => {
				rental[header] = rows[i][index] || '';
			});

			// Only include Onsen service records
			if (rental.serviceType === 'Onsen') {
				// Apply date filtering if provided
				if (startDate && endDate && rental.submittedAt) {
					const rentalDate = new Date(rental.submittedAt);
					const filterStartDate = new Date(startDate + 'T00:00:00Z');
					const filterEndDate = new Date(endDate + 'T23:59:59Z');

					if (rentalDate >= filterStartDate && rentalDate <= filterEndDate) {
						onsenRentals.push(rental);
					}
				} else if (!startDate && !endDate) {
					// No date filter, include all Onsen records
					onsenRentals.push(rental);
				}
			}
		}

		if (onsenRentals.length === 0) {
			return json(
				{
					success: false,
					error: 'No Onsen data found',
					message: 'No Onsen service records available for export'
				},
				{ status: 404 }
			);
		}

		// Prepare data for Excel export
		const exportData = onsenRentals.map((rental) => {
			const exportRow = {};
			EXPORT_FIELDS.forEach((field) => {
				const japaneseHeader = COLUMN_MAPPING[field] || field;
				let value = rental[field] || '';

				// Format specific fields
				if (field === 'discountApplied') {
					value = value === 'TRUE' || value === true ? 'はい' : 'いいえ';
				} else if (field === 'totalPrice') {
					value = value ? `¥${Number(value).toLocaleString()}` : '¥0';
				} else if (field === 'checkedInAt') {
					if (value) {
						const date = new Date(value);
						if (!isNaN(date.getTime())) {
							value = date.toLocaleString('ja-JP');
						}
					}
				}

				exportRow[japaneseHeader] = value;
			});
			return exportRow;
		});

		// Create workbook and worksheet
		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.json_to_sheet(exportData);

		// Auto-size columns
		const cols = EXPORT_FIELDS.map(() => ({ wch: 15 }));
		worksheet['!cols'] = cols;

		// Add worksheet to workbook
		XLSX.utils.book_append_sheet(workbook, worksheet, '外湯めぐりdata');

		// Generate Excel file buffer
		const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

		// Generate filename with date range or current date
		let filename;
		if (startDate && endDate) {
			if (startDate === endDate) {
				filename = `onsen-data-${startDate}.xlsx`;
			} else {
				filename = `onsen-data-${startDate}_to_${endDate}.xlsx`;
			}
		} else {
			const now = new Date();
			const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
			filename = `onsen-data-all-${dateStr}.xlsx`;
		}

		// Return the Excel file
		return new Response(excelBuffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Content-Length': excelBuffer.length.toString()
			}
		});
	} catch (error) {
		console.error('Onsen Export API Error:', error);

		if (error.message.includes('PERMISSION_DENIED')) {
			return json(
				{
					success: false,
					error: 'Permission denied',
					message: 'Unable to access Google Sheets. Check credentials.'
				},
				{ status: 403 }
			);
		}

		return json(
			{
				success: false,
				error: 'Internal server error',
				message: 'Failed to export Onsen data',
				details: error.message
			},
			{ status: 500 }
		);
	}
}

// Handle unsupported methods
/** @type {import('./$types').RequestHandler} */
export async function POST() {
	return json(
		{
			success: false,
			error: 'Method not allowed',
			message: 'This endpoint only accepts GET requests'
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
			message: 'This endpoint only accepts GET requests'
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
			message: 'This endpoint only accepts GET requests'
		},
		{ status: 405 }
	);
}
