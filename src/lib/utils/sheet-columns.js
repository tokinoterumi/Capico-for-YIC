/**
 * Google Sheets column mapping for Rentals sheet
 * Single source of truth for all API endpoints
 * Schema: A-AU (47 columns total)
 */

// Main column mapping (A-AT)
export const SHEET_COLUMNS = {
	// Basic rental information (A-L)
	rentalID: 'A',
	status: 'B',
	submittedAt: 'C',
	lastUpdated: 'D',
	customerName: 'E',
	customerContact: 'F',
	documentType: 'G',

	serviceType: 'I',
	rentalPlan: 'J',
	totalPrice: 'K',
	expectedReturn: 'L',

	// Agreement and check-in (M-Q)
	agreement: 'M',
	checkInStaff: 'N',
	checkedInAt: 'O',
	photoFileID: 'P',
	verified: 'Q',

	// Storage and return workflow (R-X)
	storedAt: 'R',
	returnedAt: 'S',
	returnStaff: 'T',
	goodCondition: 'U',
	returnNotes: 'V',
	isLate: 'W',
	minutesLate: 'X',

	// Trouble tracking (Y-Z)
	troubleNotes: 'Y',
	troubleResolved: 'Z',

	// Damage and repair (AA-AC)
	damageReported: 'AA',
	repairRequired: 'AB',
	replacementRequired: 'AC',

	// Service-specific counts and assignments (AD-AH)
	bikeCount: 'AD',
	bikeNumber: 'AE',
	onsenKeyNumber: 'AF',
	luggageCount: 'AG',
	luggageTagNumber: 'AH',

	// Demographics for onsen service (AI-AO)
	maleCount: 'AI',
	femaleCount: 'AJ',
	totalAdultCount: 'AK',
	boyCount: 'AL',
	girlCount: 'AM',
	totalChildCount: 'AN',
	kidsCount: 'AO',
	ageRange: 'AT',
	comeFrom: 'H',

	// Additional items (AP-AU)
	faceTowelCount: 'AP',
	bathTowelCount: 'AQ',
	partnerHotel: 'AR',
	createdBy: 'AS',
	checkinNotes: 'AU'
};

// Service-specific column groups for different operations
export const SERVICE_COLUMN_GROUPS = {
	// Common fields used by all services
	COMMON: [
		'rentalID',
		'status',
		'submittedAt',
		'lastUpdated',
		'customerName',
		'customerContact',
		'serviceType',
		'totalPrice',
		'createdBy'
	],

	// Check-in fields by service type
	CHECKIN: {
		Bike: [
			'status',
			'checkInStaff',
			'checkedInAt',
			'photoFileID',
			'verified',
			'documentType',
			'agreement',
			'rentalPlan',
			'expectedReturn',
			'bikeCount',
			'bikeNumber',
			'checkinNotes',
			'lastUpdated'
		],
		Onsen: [
			'status',
			'checkInStaff',
			'checkedInAt',
			'photoFileID',
			'verified',
			'documentType',
			'agreement',
			'comeFrom',
			'ageRange',
			'onsenKeyNumber',
			'maleCount',
			'femaleCount',
			'totalAdultCount',
			'boyCount',
			'girlCount',
			'totalChildCount',
			'kidsCount',
			'faceTowelCount',
			'bathTowelCount',
			'ageRange',
			'checkinNotes',
			'lastUpdated'
		],
		Luggage: [
			'status',
			'checkedInAt',
			'expectedReturn',
			'luggageCount',
			'luggageTagNumber',
			'partnerHotel',
			'checkinNotes',
			'lastUpdated'
		]
	},

	// Return/pickup fields by service type
	RETURN: {
		Bike: [
			'status',
			'returnStaff',
			'returnedAt',
			'goodCondition',
			'returnNotes',
			'isLate',
			'minutesLate',
			'damageReported',
			'repairRequired',
			'replacementRequired',
			'lastUpdated'
		],
		Onsen: [
			'status',
			'returnStaff',
			'returnedAt',
			'goodCondition',
			'returnNotes',
			'isLate',
			'minutesLate',
			'damageReported',
			'repairRequired',
			'replacementRequired',
			'lastUpdated'
		],
		Luggage: ['status', 'returnedAt', 'returnNotes', 'lastUpdated']
	},

	// Trouble tracking fields
	TROUBLE: ['troubleNotes', 'troubleResolved', 'lastUpdated'],

	// Storage management fields
	STORAGE: ['status', 'storedAt', 'lastUpdated']
};

/**
 * Get column mapping for specific fields
 * @param {string[]} fieldNames - Array of field names to get columns for
 * @returns {Object} Object with field names as keys and column letters as values
 */
export function getColumnMapping(fieldNames) {
	const mapping = {};
	fieldNames.forEach((field) => {
		if (SHEET_COLUMNS[field]) {
			mapping[field] = SHEET_COLUMNS[field];
		}
	});
	return mapping;
}

/**
 * Get column mapping for a specific service and operation
 * @param {string} serviceType - 'Bike', 'Onsen', or 'Luggage'
 * @param {string} operation - 'CHECKIN', 'RETURN', 'TROUBLE', etc.
 * @returns {Object} Column mapping for the service and operation
 */
export function getServiceColumnMapping(serviceType, operation) {
	const fields =
		SERVICE_COLUMN_GROUPS[operation]?.[serviceType] || SERVICE_COLUMN_GROUPS[operation] || [];
	return getColumnMapping(fields);
}

/**
 * Validate that all required fields have column mappings
 * @param {string[]} fieldNames - Array of field names to validate
 * @returns {Object} { valid: boolean, missing: string[] }
 */
export function validateColumnMapping(fieldNames) {
	const missing = fieldNames.filter((field) => !SHEET_COLUMNS[field]);
	return {
		valid: missing.length === 0,
		missing
	};
}

/**
 * Get the total number of columns in the sheet (for creating arrays)
 * Based on the highest column in SHEET_COLUMNS (AU = 47)
 * @returns {number} Total number of columns
 */
export function getSheetColumnCount() {
	const columnLetters = Object.values(SHEET_COLUMNS);
	let maxColumn = 0;

	columnLetters.forEach(letter => {
		const columnIndex = columnLetterToIndex(letter);
		if (columnIndex > maxColumn) {
			maxColumn = columnIndex;
		}
	});

	return maxColumn;
}

/**
 * Convert column letter(s) to zero-based index
 * @param {string} letter - Column letter (e.g., 'A', 'AU')
 * @returns {number} Zero-based column index
 */
export function columnLetterToIndex(letter) {
	let result = 0;
	for (let i = 0; i < letter.length; i++) {
		result = result * 26 + (letter.charCodeAt(i) - 64);
	}
	return result;
}
