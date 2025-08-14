import { json } from '@sveltejs/kit';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import { env } from '$env/dynamic/private';

// --- 憑證處理 ---
// 這是我們唯一需要在頂部處理的變數，因為它需要解碼和解析
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
	CREDENTIALS = {}; // 使用空物件以避免伺服器完全崩潰
}

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

async function getGoogleSheetsClient() {
	const auth = new GoogleAuth({
		credentials: CREDENTIALS,
		scopes: ['https://www.googleapis.com/auth/spreadsheets']
	});

	const authClient = await auth.getClient();
	return google.sheets({ version: 'v4', auth: authClient });
}

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
		if (!data.totalAdultCount && !data.totalChildCount) {
			errors.push('At least one adult or child count is required');
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

	// Counter registration validation
	if (registrationType === REGISTRATION_TYPES.COUNTER) {
		if (!data.staffName) errors.push('Staff name is required for counter registrations');
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
		status = 'Awaiting_Storage'; // Hotel luggage goes directly to fulfillment queue
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
			status = data.serviceType === SERVICE_TYPES.LUGGAGE ? 'Awaiting_Storage' : 'Active';
		}
	}

	const currentTime = new Date().toISOString();

	return [
		rentalId, // A: rentalID
		status, // B: status
		currentTime, // C: submittedAt
		currentTime, // D: lastUpdated
		customerName, // E: customerName
		customerContact, // F: customerContact
		documentType, // G: documentType
		data.serviceType || '', // H: serviceType
		data.rentalPlan || '', // I: rentalPlan
		data.totalPrice || 0, // J: totalPrice
		data.expectedReturn || '', // K: expectedReturn
		agreement, // L: agreement
		checkInStaff, // M: checkInStaff
		checkedInAt, // N: checkedInAt
		'', // O: photoFileID
		verified, // P: verified
		'', // Q: storageStaff
		'', // R: storedAt
		'', // S: returnedAt
		'', // T: returnStaff
		null, // U: goodCondition
		'', // V: returnNotes
		false, // W: isLate
		0, // X: minutesLate
		registrationType === REGISTRATION_TYPES.HOTEL ? '' : (data.notes || ''), // Y: troubleNotes - no notes for hotel registrations
		false, // Z: troubleResolved
		false, // AA: damageReported
		false, // AB: repairRequired
		false, // AC: replacementRequired
		data.bikeCount || 0, // AD: bikeCount
		'', // AE: bikeNumber
		'', // AF: onsenKeyNumber
		data.luggageCount || 0, // AG: luggageCount
		luggageTagNumber, // AH: luggageTagNumber
		data.companion || '', // AI: companion
		data.totalAdultCount || 1, // AJ: totalAdultCount
		data.totalChildCount || 0, // AK: totalChildCount
		data.faceTowelCount || 0, // AL: faceTowelCount
		data.bathTowelCount || 0, // AM: bathTowelCount
		data.discountApplied || false, // AN: discountApplied
		partnerHotel, // AO: partnerHotel
		data.createdBy || checkInStaff, // AP: createdBy
		data.comeFrom || '', // AQ: comeFrom
		data.unavailableBaths || '' // AR: unavailableBaths
	];
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
			range: 'Rentals!A:AR'
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
		console.error('GET Rentals error:', error);
		return json(
			{
				success: false,
				error: error.message
			},
			{ status: 500 }
		);
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
			data.staffName &&
			(data.createdBy === 'staff' || url.searchParams.get('type') === 'counter')
		) {
			registrationType = REGISTRATION_TYPES.COUNTER;
		}

		// Validate the rental data
		const validation = validateRentalData(data, registrationType);
		if (!validation.isValid) {
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
			range: 'Rentals!A:AP',
			valueInputOption: 'RAW',
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
				status: 'Awaiting_Storage',
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
		console.error('POST Rentals error:', error);

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
				message: error.message
			},
			{ status: 500 }
		);
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

		// Column mapping for updates
		const columnMap = {
			// Basic info
			rentalID: 'A',
			status: 'B',
			submittedAt: 'C',
			lastUpdated: 'D',
			customerName: 'E',
			customerContact: 'F',
			documentType: 'G',
			serviceType: 'H',
			rentalPlan: 'I',
			totalPrice: 'J',
			expectedReturn: 'K',
			agreement: 'L',

			// Check-in related
			checkInStaff: 'M',
			checkedInAt: 'N',
			photoFileID: 'O',
			verified: 'P',

			// Storage related
			storageStaff: 'Q',
			storedAt: 'R',

			// Return related
			returnedAt: 'S',
			returnStaff: 'T',
			goodCondition: 'U',
			returnNotes: 'V',
			isLate: 'W',
			minutesLate: 'X',

			// Trouble related
			troubleNotes: 'Y',
			troubleResolved: 'Z',

			// Damage/repair related
			damageReported: 'AA',
			repairRequired: 'AB',
			replacementRequired: 'AC',

			// Service-specific details
			bikeCount: 'AD',
			bikeNumber: 'AE',
			onsenKeyNumber: 'AF',
			luggageCount: 'AG',
			luggageTagNumber: 'AH',

			// Additional details
			companion: 'AI',
			totalAdultCount: 'AJ',
			totalChildCount: 'AK',
			faceTowelCount: 'AL',
			bathTowelCount: 'AM',
			discountApplied: 'AN',
			partnerHotel: 'AO',
			createdBy: 'AP'
		};

		// Apply updates
		const updateRequests = [];
		Object.keys(updateData).forEach((field) => {
			if (columnMap[field] && updateData[field] !== undefined) {
				updateRequests.push({
					range: `Rentals!${columnMap[field]}${rowIndex}`,
					values: [[updateData[field]]]
				});
			}
		});

		if (updateRequests.length > 0) {
			await sheets.spreadsheets.values.batchUpdate({
				spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
				resource: {
					valueInputOption: 'RAW',
					data: updateRequests
				}
			});
		}

		return json({
			success: true,
			rentalID: updateData.rentalID,
			updatedFields: Object.keys(updateData).filter((field) => columnMap[field]),
			photoUploaded: Boolean(updateData.photoFileID),
			message: 'Rental updated successfully',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('PUT Rentals error:', error);
		return json(
			{
				success: false,
				error: error.message
			},
			{ status: 500 }
		);
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
			sheet => sheet.properties?.title === 'Rentals'
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
			range: 'Rentals!A:AP'
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
		console.error('DELETE Rentals error:', error);
		return json(
			{
				success: false,
				error: error.message
			},
			{ status: 500 }
		);
	}
}
