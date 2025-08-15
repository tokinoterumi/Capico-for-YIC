/**
 * Google Sheets column mapping for Rentals sheet
 * Single source of truth for all API endpoints
 * Schema: A-AS (45 columns total)
 */

// Main column mapping (A-AS)
export const SHEET_COLUMNS = {
	// Basic rental information (A-L)
	rentalID: 'A',
	status: 'B',
	submittedAt: 'C',
	lastUpdated: 'D',
	customerName: 'E',
	customerContact: 'F',
	documentType: 'G',
	comeFrom: 'H',
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

	// Additional items (AP-AS)
	faceTowelCount: 'AP',
	bathTowelCount: 'AQ',
	partnerHotel: 'AR',
	createdBy: 'AS'
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
			'lastUpdated'
		],
		Luggage: [
			'status',
			'checkedInAt',
			'expectedReturn',
			'luggageCount',
			'luggageTagNumber',
			'partnerHotel',
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
