import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { SHEET_COLUMNS, getSheetColumnCount, columnLetterToIndex } from '$utils/sheet-columns';
import { getGoogleSheetsClient } from '$utils/google-sheets-client';
import { updateSheetsRow } from '$utils/sheets-updater';
import { handleApiError } from '$utils/api-error-handler';

const SERVICE_TYPES = {
	BIKE: 'Bike',
	ONSEN: 'Onsen',
	LUGGAGE: 'Luggage'
};

const REGISTRATION_TYPES = {
	CUSTOMER: 'customer', // Customer self-registration (kiosk/web)
	COUNTER: 'counter', // Staff counter registration
	HOTEL: 'hotel' // Hotel partnership registration
};


// Generate service and registration type specific rental ID
function generateRentalId(
	serviceType,
	registrationType = REGISTRATION_TYPES.CUSTOMER,
	hotelName = null
) {
	const timestamp = Date.now().toString().slice(-8);

	// Service prefix
	const servicePrefixes = {
		[SERVICE_TYPES.BIKE]: 'B',
		[SERVICE_TYPES.ONSEN]: 'O',
		[SERVICE_TYPES.LUGGAGE]: 'L'
	};

	// Registration type prefix
	const registrationPrefixes = {
		[REGISTRATION_TYPES.CUSTOMER]: '',
		[REGISTRATION_TYPES.COUNTER]: 'C',
		[REGISTRATION_TYPES.HOTEL]: 'H'
	};

	let prefix = servicePrefixes[serviceType] || 'R';
	prefix += registrationPrefixes[registrationType] || '';

	// Add hotel code for hotel registrations
	if (registrationType === REGISTRATION_TYPES.HOTEL && hotelName) {
		const hotelCode = hotelName
			.replace(/[^a-zA-Z]/g, '')
			.substring(0, 3)
			.toUpperCase();
		prefix += hotelCode;
	}

	return `${prefix}${timestamp}`;
}

/**
 * Populate common fields that are shared across all service types
 * @param {Array} row - The array representing the spreadsheet row
 * @param {Object} commonData - Object containing common field values
 */
function populateCommonFields(row, commonData) {
	// Common fields present in all service types
	row[columnLetterToIndex('A') - 1] = commonData.rentalId; // A: rentalID
	row[columnLetterToIndex('B') - 1] = commonData.status; // B: status
	row[columnLetterToIndex('C') - 1] = commonData.currentTime; // C: submittedAt
	row[columnLetterToIndex('D') - 1] = commonData.currentTime; // D: lastUpdated
	row[columnLetterToIndex('E') - 1] = commonData.customerName; // E: customerName
	row[columnLetterToIndex('F') - 1] = commonData.customerContact; // F: customerContact
	row[columnLetterToIndex('I') - 1] = commonData.serviceType; // I: serviceType
	row[columnLetterToIndex('K') - 1] = commonData.totalPrice || 0; // K: totalPrice
	row[columnLetterToIndex('L') - 1] = commonData.expectedReturn; // L: expectedReturn
	row[columnLetterToIndex('O') - 1] = commonData.checkedInAt; // O: checkedInAt
}

/**
 * Populate common workflow/status fields for Bike and Onsen services
 * @param {Array} row - The array representing the spreadsheet row
 * @param {Object} workflowData - Object containing workflow field values
 */
function populateWorkflowFields(row, workflowData) {
	// Common workflow fields for Bike and Onsen services
	row[columnLetterToIndex('P') - 1] = ''; // P: photoFileID
	row[columnLetterToIndex('Q') - 1] = workflowData.verified; // Q: verified
	row[columnLetterToIndex('R') - 1] = ''; // R: storedAt
	row[columnLetterToIndex('S') - 1] = ''; // S: returnedAt
	row[columnLetterToIndex('T') - 1] = ''; // T: returnStaff
	row[columnLetterToIndex('U') - 1] = null; // U: goodCondition
	row[columnLetterToIndex('V') - 1] = ''; // V: returnNotes
	row[columnLetterToIndex('W') - 1] = false; // W: isLate
	row[columnLetterToIndex('X') - 1] = 0; // X: minutesLate
	row[columnLetterToIndex('Y') - 1] = ''; // Y: troubleNotes
	row[columnLetterToIndex('Z') - 1] = false; // Z: troubleResolved
	row[columnLetterToIndex('AA') - 1] = false; // AA: damageReported
	row[columnLetterToIndex('AB') - 1] = false; // AB: repairRequired
	row[columnLetterToIndex('AC') - 1] = false; // AC: replacementRequired
	row[columnLetterToIndex('AS') - 1] = workflowData.createdBy; // AS: createdBy
}

/**
 * Create common data object for populateCommonFields
 * @param {Object} params - Parameters for common fields
 * @returns {Object} Common data object
 */
function createCommonFieldsData(params) {
	return {
		rentalId: params.rentalId,
		status: params.status,
		currentTime: params.currentTime,
		customerName: params.customerName,
		customerContact: params.customerContact,
		serviceType: params.serviceType,
		totalPrice: params.totalPrice,
		expectedReturn: params.expectedReturn,
		checkedInAt: params.checkedInAt
	};
}

/**
 * Populate service-specific count fields to reduce repetitive patterns
 * @param {Array} row - The array representing the spreadsheet row
 * @param {Object} data - The request data containing count fields
 * @param {Object} fieldMapping - Object mapping data fields to column indices
 */
function populateCountFields(row, data, fieldMapping) {
	Object.entries(fieldMapping).forEach(([dataField, columnIndex]) => {
		row[columnIndex] = data[dataField] || 0;
	});
}

/**
 * Create and populate service-specific row with base structure to eliminate duplication
 * @param {Object} commonFieldsData - Common field data for all services
 * @param {Object} workflowData - Workflow data for services that require it
 * @param {boolean} includeWorkflow - Whether to include workflow fields (Bike/Onsen vs Luggage)
 * @returns {Array} Initialized row array with common fields populated
 */
function createServiceRow(commonFieldsData, workflowData = null, includeWorkflow = false) {
	const row = new Array(getSheetColumnCount());

	// Populate common fields for all services
	populateCommonFields(row, commonFieldsData);

	// Populate workflow fields for Bike and Onsen services
	if (includeWorkflow && workflowData) {
		populateWorkflowFields(row, workflowData);
	}

	return row;
}

// Validate rental data based on service type and registration type
function validateRentalData(data, registrationType) {
	const errors = [];

	// Universal required fields (except for hotel registrations)
	if (registrationType !== REGISTRATION_TYPES.HOTEL && !data.customerName?.trim()) {
		errors.push('Customer name is required');
	}

	if (!data.serviceType || !Object.values(SERVICE_TYPES).includes(data.serviceType)) {
		errors.push('Valid service type is required (Bike, Onsen, or Luggage)');
	}

	// Customer contact required for non-hotel registrations
	if (registrationType !== REGISTRATION_TYPES.HOTEL && !data.customerContact?.trim()) {
		errors.push('Customer contact is required');
	}

	// Service-specific validation
	if (data.serviceType === SERVICE_TYPES.BIKE) {
		if (!data.rentalPlan) errors.push('Rental plan is required for bike service');
		if (!data.bikeCount || data.bikeCount < 1) errors.push('Valid bike count is required');
		if (data.totalPrice === undefined || data.totalPrice < 0)
			errors.push('Valid price is required');
		if (registrationType === REGISTRATION_TYPES.CUSTOMER && !data.agreement) {
			errors.push('Agreement is required for bike service');
		}
	}

	if (data.serviceType === SERVICE_TYPES.ONSEN) {
		if (data.totalPrice === undefined || data.totalPrice < 0)
			errors.push('Valid price is required');
		if (registrationType === REGISTRATION_TYPES.CUSTOMER && !data.agreement) {
			errors.push('Agreement is required for onsen service');
		}
		if (!data.totalAdultCount && !data.totalChildCount && !data.kidsCount) {
			errors.push('At least one adult, child, or kids count is required');
		}
	}

	if (data.serviceType === SERVICE_TYPES.LUGGAGE) {
		if (!data.luggageCount || data.luggageCount < 1) {
			errors.push('Valid luggage count is required');
		}
	}

	// Hotel-specific validation (simplified - no hotel list validation)
	if (registrationType === REGISTRATION_TYPES.HOTEL) {
		if (!data.hotelName?.trim()) {
			errors.push('Hotel name is required for hotel registrations');
		}
	}

	return { isValid: errors.length === 0, errors };
}

// Prepare row data for Google Sheets
function prepareRowData(data, rentalId, registrationType) {
	let customerName = data.customerName || '';
	let customerContact = data.customerContact || '';
	let documentType = data.documentType || '';
	let status = 'Pending';
	let checkInStaff = '';
	let checkedInAt = '';
	let verified = false;
	let agreement = Boolean(data.agreement);
	let luggageTagNumber = '';
	let partnerHotel = '';

	// Handle different registration types
	if (registrationType === REGISTRATION_TYPES.HOTEL) {
		customerName = data.hotelName; // Just use hotel name directly
		customerContact = ''; // Leave blank for hotel registrations
		documentType = ''; // Leave blank for hotel registrations
		status = 'Pending'; // Hotel luggage starts as Pending
		checkInStaff = ''; // No staff tracking for luggage
		checkedInAt = new Date().toISOString();
		verified = true; // Auto-verified for trusted partners
		agreement = true; // Auto-accepted for hotel partnerships
		partnerHotel = data.hotelName || '';

		// Use hotel's tag numbers if provided
		luggageTagNumber = data.hotelTagNumbers || '';
	} else if (registrationType === REGISTRATION_TYPES.COUNTER) {
		documentType = data.documentType || 'on_site';
		// Counter registrations can be immediately checked in if staff chooses
		if (data.immediateCheckin) {
			checkInStaff = data.staffName;
			checkedInAt = new Date().toISOString();
			verified = true;
			status = 'Pending'; // Counter registrations start as Pending regardless of service type
		}
	}

	const currentTime = new Date().toISOString();

	// Handle expectedReturn - can be either time string or full ISO datetime
	let expectedReturn = data.expectedReturn || '';
	if (expectedReturn && expectedReturn.includes(':') && !expectedReturn.includes('T')) {
		// If it's just a time string (e.g., "14:12"), convert to today's datetime
		const today = new Date();
		const [hours, minutes] = expectedReturn.split(':').map(Number);
		const expectedDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		expectedDateTime.setHours(hours, minutes, 0, 0);
		expectedReturn = expectedDateTime.toISOString();
	}

	// Create common data object used across all service types
	const commonFieldsData = createCommonFieldsData({
		rentalId,
		status,
		currentTime,
		customerName,
		customerContact,
		serviceType: data.serviceType,
		totalPrice: data.totalPrice,
		expectedReturn,
		checkedInAt
	});

	// Create service-specific row data
	if (data.serviceType === 'Luggage') {
		// Luggage-only row - minimal essential fields
		const luggageRow = createServiceRow(commonFieldsData, null, false);

		// Luggage-specific fields
		luggageRow[24] = ''; // Y: troubleNotes
		luggageRow[33] = luggageTagNumber; // AH: luggageTagNumber
		luggageRow[43] = partnerHotel; // AR: partnerHotel

		// Populate luggage count field
		populateCountFields(luggageRow, data, {
			luggageCount: 32 // AG: luggageCount
		});

		// Fill remaining undefined slots with empty strings
		return luggageRow.map((val) => (val === undefined ? '' : val));
	} else if (data.serviceType === 'Onsen') {
		// Onsen-specific row - relevant fields only
		const onsenRow = createServiceRow(commonFieldsData, {
			verified,
			createdBy: data.createdBy || checkInStaff
		}, true);

		// Onsen-specific fields
		onsenRow[6] = documentType; // G: documentType
		onsenRow[7] = data.comeFrom || ''; // H: comeFrom
		onsenRow[12] = agreement; // M: agreement
		onsenRow[13] = checkInStaff; // N: checkInStaff
		onsenRow[31] = ''; // AF: onsenKeyNumber

		// Populate Onsen demographic count fields
		populateCountFields(onsenRow, data, {
			adultMaleCount: 34, // AI: maleCount
			adultFemaleCount: 35, // AJ: femaleCount
			totalAdultCount: 36, // AK: totalAdultCount
			childMaleCount: 37, // AL: boyCount
			childFemaleCount: 38, // AM: girlCount
			totalChildCount: 39, // AN: totalChildCount
			kidsCount: 40, // AO: kidsCount
			faceTowelCount: 41, // AP: faceTowelCount
			bathTowelCount: 42 // AQ: bathTowelCount
		});

		// onsenRow[44] = data.createdBy || checkInStaff; // AS: createdBy - already set by populateWorkflowFields
		onsenRow[45] = data.ageRange || ''; // AT: ageRange

		// Fill remaining undefined slots with empty strings
		return onsenRow.map((val) => (val === undefined ? '' : val));
	} else {
		// Bike services - full data with bike-specific fields
		const bikeRow = createServiceRow(commonFieldsData, {
			verified,
			createdBy: data.createdBy || checkInStaff
		}, true);

		// Bike-specific fields
		bikeRow[6] = documentType; // G: documentType
		bikeRow[9] = data.rentalPlan || ''; // J: rentalPlan
		bikeRow[12] = agreement; // M: agreement
		bikeRow[13] = checkInStaff; // N: checkInStaff
		bikeRow[30] = ''; // AE: bikeNumber

		// Populate bike count field
		populateCountFields(bikeRow, data, {
			bikeCount: 29 // AD: bikeCount
		});

		// Fill remaining undefined slots with empty strings
		return bikeRow.map((val) => (val === undefined ? '' : val));
	}
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const sheets = await getGoogleSheetsClient();

		// Parse query parameters for filtering
		const status = url.searchParams.get('status');
		const serviceType = url.searchParams.get('serviceType');
		const limit = parseInt(url.searchParams.get('limit')) || null;
		const offset = parseInt(url.searchParams.get('offset')) || 0;

		// Get all rental data
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

			// Apply filters
			if (status && rental.status !== status) continue;
			if (serviceType && rental.serviceType !== serviceType) continue;

			rentals.push(rental);
		}

		// Apply pagination
		const total = rentals.length;
		if (limit) {
			rentals = rentals.slice(offset, offset + limit);
		}

		return json({
			success: true,
			rentals,
			total,
			pagination: limit ? { limit, offset, hasMore: offset + limit < total } : null,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return handleApiError(error, 'GET Rentals API');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, url }) {
	try {
		const data = await request.json();
		const sheets = await getGoogleSheetsClient();

		// Determine registration type from request data or URL params
		let registrationType = REGISTRATION_TYPES.CUSTOMER; // default

		if (data.hotelName) {
			registrationType = REGISTRATION_TYPES.HOTEL;
		} else if (
			url.searchParams.get('type') === 'counter' ||
			data.submissionType === 'STAFF_COUNTER'
		) {
			registrationType = REGISTRATION_TYPES.COUNTER;
		}

		// Validate the rental data
		const validation = validateRentalData(data, registrationType);
		if (!validation.isValid) {
			console.log('Validation failed for:', data);
			console.log('Registration type:', registrationType);
			console.log('Validation errors:', validation.errors);
			return json(
				{
					success: false,
					error: 'Validation failed',
					details: validation.errors
				},
				{ status: 400 }
			);
		}

		// Generate appropriate rental ID
		const rentalId =
			data.rentalID || generateRentalId(data.serviceType, registrationType, data.hotelName);

		// Prepare row data for the specific registration type
		const rowData = prepareRowData(data, rentalId, registrationType);

		// Insert into Google Sheets
		await sheets.spreadsheets.values.append({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: 'Rentals!A:AU',
			valueInputOption: 'RAW',
			insertDataOption: 'INSERT_ROWS',
			resource: {
				values: [rowData]
			}
		});

		// Prepare success response based on registration type
		let responseData = {
			success: true,
			rentalId,
			serviceType: data.serviceType,
			registrationType,
			message: 'Rental registered successfully',
			timestamp: new Date().toISOString()
		};

		// Add type-specific data to response
		if (registrationType === REGISTRATION_TYPES.HOTEL) {
			const PRICE_PER_ITEM = 500;
			const totalPrice = data.luggageCount * PRICE_PER_ITEM;

			responseData.hotelLuggage = {
				hotelName: data.hotelName,
				luggageCount: data.luggageCount,
				tagNumbers: data.hotelTagNumbers
					? data.hotelTagNumbers.split(', ').map((tag) => tag.trim())
					: [],
				totalPrice,
				registeredBy: data.staffName,
				status: 'Pending',
				expectedReturn: data.expectedReturn,
				notes: data.notes || ''
			};
			responseData.message = 'Hotel luggage registered successfully';
		} else if (registrationType === REGISTRATION_TYPES.COUNTER) {
			responseData.counterRegistration = {
				staffName: data.staffName,
				immediateCheckin: Boolean(data.immediateCheckin),
				customerName: data.customerName,
				serviceType: data.serviceType
			};
			responseData.message = 'Counter registration completed successfully';
		}

		// Log for audit purposes
		console.log(
			`${registrationType.toUpperCase()} REGISTRATION: ${data.serviceType} service for ${data.customerName} - ID: ${rentalId}`
		);

		return json(responseData, { status: 201 });
	} catch (error) {
		return handleApiError(error, 'POST Rentals API');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ request }) {
	try {
		const updateData = await request.json();
		const sheets = await getGoogleSheetsClient();

		if (!updateData.rentalID) {
			return json(
				{
					success: false,
					error: 'Missing rental ID'
				},
				{ status: 400 }
			);
		}

		// Get current data to find the row
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: 'Rentals!A:A'
		});

		const rows = response.data.values || [];
		let rowIndex = -1;

		for (let i = 1; i < rows.length; i++) {
			if (rows[i][0] === updateData.rentalID) {
				rowIndex = i + 1; // +1 because sheets are 1-indexed
				break;
			}
		}

		if (rowIndex === -1) {
			return json(
				{
					success: false,
					error: 'Rental not found'
				},
				{ status: 404 }
			);
		}

		// Update rental record with photo upload via Google Apps Script
		if (updateData.photoData && updateData.photoData.includes('base64')) {
			try {
				// Send photo to Google Apps Script for secure processing
				const photoUploadPayload = {
					action: 'uploadPhoto',
					rentalID: updateData.rentalID,
					photoData: updateData.photoData,
					fileName: `${updateData.rentalID}_ID_${Date.now()}.jpg`
				};

				const gasResponse = await fetch(env.GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(photoUploadPayload)
				});

				if (!gasResponse.ok) {
					console.error('Google Apps Script photo upload failed:', await gasResponse.text());
					return json(
						{
							success: false,
							error: 'Photo upload failed',
							message: 'Unable to upload photo to secure storage'
						},
						{ status: 502 }
					);
				}

				const gasResult = await gasResponse.json();

				if (gasResult.success) {
					// Add the returned file ID to our updates
					updateData.photoFileID = gasResult.fileId;
					console.log(
						`Photo uploaded successfully for ${updateData.rentalID}: ${gasResult.fileId}`
					);
				} else {
					console.error('Google Apps Script photo upload error:', gasResult.error);
					return json(
						{
							success: false,
							error: 'Photo processing failed',
							message: gasResult.error || 'Photo could not be processed'
						},
						{ status: 500 }
					);
				}
			} catch (photoError) {
				console.error('Photo upload network error:', photoError);
				return json(
					{
						success: false,
						error: 'Photo upload network error',
						message: 'Unable to connect to photo storage service'
					},
					{ status: 503 }
				);
			}
		}

		// Use shared column mapping
		const columnMap = SHEET_COLUMNS;

		// Apply updates using shared utility
		await updateSheetsRow(sheets, env.GOOGLE_SPREADSHEET_ID, updateData, columnMap, rowIndex);

		return json({
			success: true,
			rentalID: updateData.rentalID,
			updatedFields: Object.keys(updateData).filter((field) => columnMap[field]),
			photoUploaded: Boolean(updateData.photoFileID),
			message: 'Rental updated successfully',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return handleApiError(error, 'PUT Rentals API');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ url }) {
	try {
		const rentalID = url.searchParams.get('rentalID');
		const sheets = await getGoogleSheetsClient();

		if (!rentalID) {
			return json(
				{
					success: false,
					error: 'Missing rental ID'
				},
				{ status: 400 }
			);
		}

		// Get spreadsheet metadata to find the correct sheet ID
		const spreadsheetResponse = await sheets.spreadsheets.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID
		});

		const rentalsSheet = spreadsheetResponse.data.sheets?.find(
			(sheet) => sheet.properties?.title === 'Rentals'
		);

		if (!rentalsSheet || !rentalsSheet.properties) {
			return json(
				{
					success: false,
					error: 'Rentals sheet not found'
				},
				{ status: 500 }
			);
		}

		const sheetId = rentalsSheet.properties.sheetId;

		// Get current data to find the row
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
			range: 'Rentals!A:AU'
		});

		const rows = response.data.values || [];
		let rowIndex = -1;
		let rentalData = null;

		for (let i = 1; i < rows.length; i++) {
			if (rows[i][0] === rentalID) {
				rowIndex = i + 1; // +1 because sheets are 1-indexed
				rentalData = rows[i];
				break;
			}
		}

		if (rowIndex === -1) {
			return json(
				{
					success: false,
					error: 'Rental not found'
				},
				{ status: 404 }
			);
		}

		// Check if rental can be deleted (not Active)
		const currentStatus = rentalData[1]; // Status column
		if (currentStatus === 'Active') {
			return json(
				{
					success: false,
					error: 'Cannot delete active rental',
					message: 'Active rentals must be returned before deletion'
				},
				{ status: 400 }
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

		// Log deletion for audit
		console.log(
			`DELETION: Rental ${rentalID} deleted - Customer: ${rentalData[3]}, Service: ${rentalData[24]}`
		);

		return json({
			success: true,
			rentalID,
			message: 'Rental deleted successfully',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return handleApiError(error, 'DELETE Rentals API');
	}
}
