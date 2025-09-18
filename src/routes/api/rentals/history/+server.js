import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getGoogleSheetsClient } from '$utils/google-sheets-client';
import { handleApiError, handleMethodNotAllowed } from '$utils/api-error-handler';

/**
 * Historical rentals query API endpoint
 * Provides advanced filtering and search capabilities for rental history
 */

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const sheets = await getGoogleSheetsClient();

		// Parse query parameters
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');
		const status = url.searchParams.get('status');
		const serviceType = url.searchParams.get('serviceType');
		const customerName = url.searchParams.get('customerName');
		const customerContact = url.searchParams.get('customerContact');
		const staffName = url.searchParams.get('staffName');
		const rentalID = url.searchParams.get('rentalID');
		const limit = parseInt(url.searchParams.get('limit')) || 100;
		const offset = parseInt(url.searchParams.get('offset')) || 0;
		const sortBy = url.searchParams.get('sortBy') || 'submittedAt';
		const sortOrder = url.searchParams.get('sortOrder') || 'desc';

		// Get all rental data from Google Sheets
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: 'Rentals!A:AU'
		});

		const rows = response.data.values || [];
		if (rows.length <= 1) {
			return json({
				success: true,
				rentals: [],
				total: 0,
				filtered: 0,
				pagination: {
					limit,
					offset,
					hasMore: false
				},
				filters: {
					startDate,
					endDate,
					status,
					serviceType,
					customerName,
					customerContact,
					rentalID
				},
				timestamp: new Date().toISOString()
			});
		}

		const headers = rows[0];
		let rentals = [];

		// Convert rows to objects
		for (let i = 1; i < rows.length; i++) {
			const rental = {};
			headers.forEach((header, index) => {
				rental[header] = rows[i][index] || '';
			});
			rentals.push(rental);
		}

		const totalRecords = rentals.length;

		// Apply filters
		let filteredRentals = rentals.filter((rental) => {
			// Date range filter (based on submittedAt)
			if (startDate || endDate) {
				const submittedDate = new Date(rental.submittedAt);
				if (startDate && submittedDate < new Date(startDate)) return false;
				if (endDate) {
					// Include the entire end date (until 23:59:59)
					const endDateTime = new Date(endDate);
					endDateTime.setHours(23, 59, 59, 999);
					if (submittedDate > endDateTime) return false;
				}
			}

			// Status filter
			if (status && rental.status !== status) return false;

			// Service type filter
			if (serviceType && rental.serviceType !== serviceType) return false;

			// Customer name filter (case-insensitive partial match)
			if (customerName && !rental.customerName?.toLowerCase().includes(customerName.toLowerCase())) {
				return false;
			}

			// Customer contact filter (exact match for privacy)
			if (customerContact && rental.customerContact !== customerContact) return false;

			// Staff name filter (case-insensitive partial match across staff fields)
			if (staffName) {
				const staffFields = [rental.checkInStaff, rental.returnStaff, rental.createdBy];
				const hasStaffMatch = staffFields.some(field =>
					field && field.toLowerCase().includes(staffName.toLowerCase())
				);
				if (!hasStaffMatch) return false;
			}

			// Rental ID filter (exact match)
			if (rentalID && rental.rentalID !== rentalID) return false;

			return true;
		});

		const filteredCount = filteredRentals.length;

		// Sort rentals
		filteredRentals.sort((a, b) => {
			let aValue = a[sortBy] || '';
			let bValue = b[sortBy] || '';

			// Handle date sorting
			if (sortBy.includes('At') || sortBy === 'submittedAt' || sortBy === 'expectedReturn') {
				aValue = new Date(aValue);
				bValue = new Date(bValue);
			}

			// Handle numeric sorting
			if (sortBy === 'totalPrice' || sortBy.includes('Count') || sortBy === 'minutesLate') {
				aValue = Number(aValue) || 0;
				bValue = Number(bValue) || 0;
			}

			if (sortOrder === 'desc') {
				return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
			} else {
				return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
			}
		});

		// Apply pagination
		const paginatedRentals = filteredRentals.slice(offset, offset + limit);

		// Calculate statistics for the filtered results
		const stats = {
			total: filteredCount,
			byStatus: {},
			byServiceType: {},
			totalRevenue: 0,
			dateRange: {
				earliest: null,
				latest: null
			}
		};

		// Calculate statistics
		filteredRentals.forEach((rental) => {
			// Status counts
			stats.byStatus[rental.status] = (stats.byStatus[rental.status] || 0) + 1;

			// Service type counts
			stats.byServiceType[rental.serviceType] = (stats.byServiceType[rental.serviceType] || 0) + 1;

			// Total revenue
			stats.totalRevenue += Number(rental.totalPrice) || 0;

			// Date range
			const submittedDate = new Date(rental.submittedAt);
			if (!stats.dateRange.earliest || submittedDate < new Date(stats.dateRange.earliest)) {
				stats.dateRange.earliest = rental.submittedAt;
			}
			if (!stats.dateRange.latest || submittedDate > new Date(stats.dateRange.latest)) {
				stats.dateRange.latest = rental.submittedAt;
			}
		});

		return json({
			success: true,
			rentals: paginatedRentals,
			total: totalRecords,
			filtered: filteredCount,
			stats,
			pagination: {
				limit,
				offset,
				hasMore: offset + limit < filteredCount,
				totalPages: Math.ceil(filteredCount / limit),
				currentPage: Math.floor(offset / limit) + 1
			},
			filters: {
				startDate,
				endDate,
				status,
				serviceType,
				customerName: customerName ? '[FILTERED]' : null, // Don't echo sensitive search terms
				customerContact: customerContact ? '[FILTERED]' : null,
				rentalID,
				sortBy,
				sortOrder
			},
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return handleApiError(error, 'Historical Rentals API');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST() {
	return handleMethodNotAllowed('GET', 'Query historical rental data with advanced filtering');
}

/** @type {import('./$types').RequestHandler} */
export async function PUT() {
	return handleMethodNotAllowed('GET');
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE() {
	return handleMethodNotAllowed('GET');
}