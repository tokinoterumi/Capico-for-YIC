import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getServiceColumnMapping } from '$utils/sheet-columns';
import { getGoogleSheetsClient } from '$utils/google-sheets-client';
import { updateSheetsRow, findRentalRow } from '$utils/sheets-updater';
import { handleApiError, handleMethodNotAllowed } from '$utils/api-error-handler';

// Helper function to get rental plan duration in hours
function getRentalPlanDurationHours(rentalPlan) {
	switch (rentalPlan) {
		case '2hours':
			return 2;
		case '3hours':
			return 3;
		case '4hours':
			return 4;
		case 'fullday':
			return 8; // 8-hour full day
		default:
			return 4; // Default to 4 hours if unknown plan
	}
}

async function fetchRentalData(rentalID) {
	try {
		const sheets = await getGoogleSheetsClient();
		const rentalData = await findRentalRow(sheets, env.GOOGLE_SPREADSHEET_ID, rentalID);
		return rentalData ? rentalData.currentRental : null;
	} catch (error) {
		console.error('Error fetching rental data:', error);
		throw error;
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		// Parse the incoming request body
		const checkinData = await request.json();

		// Validate required fields
		if (!checkinData.rentalID) {
			return json(
				{
					error: 'Missing rental ID',
					message: 'rentalID is required for check-in'
				},
				{ status: 400 }
			);
		}

		// Fetch actual rental data from database
		const rentalData = await fetchRentalData(checkinData.rentalID);
		
		if (!rentalData) {
			return json(
				{
					error: 'Rental not found',
					message: `No rental found with ID: ${checkinData.rentalID}`
				},
				{ status: 404 }
			);
		}

		// Get service type from actual rental data
		const serviceType = rentalData.serviceType || 'Luggage';

		// Staff name only required for non-Luggage services
		if (serviceType !== 'Luggage' && !checkinData.staffName) {
			return json(
				{
					error: 'Missing staff information',
					message: 'staffName is required for check-in'
				},
				{ status: 400 }
			);
		}

		// Validate ID photo data (only required for non-Luggage services)
		const photoRequired = serviceType !== 'Luggage';

		if (photoRequired && (!checkinData.photoData || !checkinData.photoFileName)) {
			return json(
				{
					error: 'Missing ID photo',
					message: 'photoData and photoFileName are required for check-in'
				},
				{ status: 400 }
			);
		}

		// Validate photo format (only if photo is provided)
		if (checkinData.photoData) {
			const validPhotoFormats = ['image/jpeg', 'image/jpg', 'image/png'];
			if (!checkinData.photoMimeType || !validPhotoFormats.includes(checkinData.photoMimeType)) {
				return json(
					{
						error: 'Invalid photo format',
						message: `Photo must be JPEG or PNG format. Received: ${checkinData.photoMimeType}`,
						validFormats: validPhotoFormats
					},
					{ status: 400 }
				);
			}
		}

		// Validate rental status - only Pending rentals can be checked in
		if (rentalData.status !== 'Pending') {
			return json(
				{
					error: 'Invalid rental status',
					message: `Rental ${checkinData.rentalID} has status '${rentalData.status}' and cannot be checked in. Only 'Pending' rentals can be checked in.`,
					currentStatus: rentalData.status
				},
				{ status: 400 }
			);
		}

		// Prepare resource assignment data
		const resourceData = {
			nextStatus: '',
			bikeNumber: '',
			onsenKeyNumber: '',
			luggageTagNumbers: []
		};

		// Service-specific resource validation and assignment
		if (serviceType === 'Bike') {
			if (!checkinData.bikeNumbers || checkinData.bikeNumbers.length === 0) {
				return json(
					{
						error: 'Missing bike assignment',
						message: 'bikeNumbers array is required for bike rentals'
					},
					{ status: 400 }
				);
			}

			// Validate bike count against rental data
			const expectedBikeCount = parseInt(rentalData.bikeCount || '0');
			if (checkinData.bikeNumbers.length !== expectedBikeCount) {
				return json(
					{
						error: 'Bike count mismatch',
						message: `Expected ${expectedBikeCount} bikes but received ${checkinData.bikeNumbers.length} bike numbers`,
						expectedCount: expectedBikeCount,
						receivedCount: checkinData.bikeNumbers.length
					},
					{ status: 400 }
				);
			}

			resourceData.bikeNumber = checkinData.bikeNumbers.join(', ');
			resourceData.nextStatus = 'Active';
		} else if (serviceType === 'Onsen') {
			if (!checkinData.onsenKeyNumbers || checkinData.onsenKeyNumbers.length === 0) {
				return json(
					{
						error: 'Missing onsen key assignment',
						message: 'onsenKeyNumbers array is required for onsen passes'
					},
					{ status: 400 }
				);
			}

			// Onsen keys are manually assigned to groups - no strict validation needed
			// Just ensure at least one key is provided for the group

			resourceData.onsenKeyNumber = checkinData.onsenKeyNumbers.join(', ');
			resourceData.nextStatus = 'Active';
		} else if (serviceType === 'Luggage') {
			if (!checkinData.luggageTagNumbers || checkinData.luggageTagNumbers.length === 0) {
				return json(
					{
						error: 'Missing luggage tag numbers',
						message: 'luggageTagNumbers is required for luggage storage check-in'
					},
					{ status: 400 }
				);
			}

			resourceData.luggageTagNumbers = checkinData.luggageTagNumbers;
			resourceData.nextStatus = 'Active'; // All services go to Active after checkin
		}

		// Upload photo to Google Apps Script (if photo exists)
		let photoFileId = null;
		if (checkinData.photoData && checkinData.photoFileName) {
			const gasPayload = {
				action: 'uploadPhoto',
				photoData: checkinData.photoData,
				fileName: checkinData.photoFileName
			};

			const gasResponse = await fetch(env.GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(gasPayload)
			});

			if (!gasResponse.ok) {
				const errorText = await gasResponse.text();
				console.error('Google Apps Script photo upload error:', errorText);

				return json(
					{
						error: 'Photo upload failed',
						message: 'Failed to upload photo to Google Apps Script',
						details: errorText
					},
					{ status: 502 }
				);
			}

			const gasResult = await gasResponse.json();

			// Check if Google Apps Script returned an error
			if (!gasResult.success) {
				console.error('Google Apps Script photo upload error:', gasResult.error);

				return json(
					{
						error: 'Photo upload failed',
						message: gasResult.error || 'Failed to upload photo',
						details: gasResult.details || 'No additional details'
					},
					{ status: 500 }
				);
			}

			photoFileId = gasResult.fileId;
		}

		// Update rental record in Google Sheets
		try {
			const sheets = await getGoogleSheetsClient();

			// Get current data to find the row
			const response = await sheets.spreadsheets.values.get({
				spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
				range: 'Rentals!A:A'
			});

			const rows = response.data.values || [];
			let rowIndex = -1;

			for (let i = 1; i < rows.length; i++) {
				if (rows[i][0] === checkinData.rentalID) {
					rowIndex = i + 1; // +1 because sheets are 1-indexed
					break;
				}
			}

			if (rowIndex === -1) {
				console.error(`Rental ${checkinData.rentalID} not found in spreadsheet`);
				return json(
					{
						success: false,
						error: 'Rental not found',
						message: 'Could not find rental record to update'
					},
					{ status: 404 }
				);
			}

			// Get service-specific column mapping from shared utility
			const columnMap = getServiceColumnMapping(serviceType, 'CHECKIN');

			// Prepare service-specific updates
			let updates = {
				status: resourceData.nextStatus,
				checkedInAt: new Date().toISOString(),
				lastUpdated: new Date().toISOString()
			};

			// Add service-specific fields
			if (serviceType === 'Luggage') {
				// Luggage-specific updates (minimal fields)
				if (resourceData.luggageTagNumbers && resourceData.luggageTagNumbers.length > 0) {
					updates.luggageTagNumber = resourceData.luggageTagNumbers.join(', ');
					updates.luggageCount = resourceData.luggageTagNumbers.length;
				}
				if (checkinData.expectedReturn) {
					updates.expectedReturn = checkinData.expectedReturn;
				}
				if (checkinData.partnerHotel) {
					updates.partnerHotel = checkinData.partnerHotel;
				}
				if (checkinData.notes) {
					updates.checkinNotes = checkinData.notes;
				}
			} else {
				updates.checkInStaff = checkinData.staffName;
				updates.verified = checkinData.verified ? 'TRUE' : 'FALSE';
				
				if (photoFileId) {
					updates.photoFileID = photoFileId;
				}
				if (checkinData.documentType) {
					updates.documentType = checkinData.documentType;
				}
				if (checkinData.agreement !== undefined) {
					updates.agreement = checkinData.agreement ? 'TRUE' : 'FALSE';
				}
				if (checkinData.notes) {
					updates.checkinNotes = checkinData.notes;
				}

				// Service-specific resource assignments
				if (serviceType === 'Bike') {
					if (resourceData.bikeNumber) {
						updates.bikeNumber = resourceData.bikeNumber;
					}
					if (checkinData.rentalPlan) {
						updates.rentalPlan = checkinData.rentalPlan;
					}
					// Calculate expectedReturn based on check-in time + rental plan duration
					const rentalPlan = rentalData.rentalPlan || checkinData.rentalPlan;
					if (rentalPlan) {
						const checkinTime = new Date(updates.checkedInAt); // Use the actual recorded check-in time
						const durationHours = getRentalPlanDurationHours(rentalPlan);
						const expectedReturnTime = new Date(checkinTime.getTime() + (durationHours * 60 * 60 * 1000));
						updates.expectedReturn = expectedReturnTime.toISOString();
					}
					if (checkinData.bikeCount) {
						updates.bikeCount = checkinData.bikeCount;
					}
				} else if (serviceType === 'Onsen') {
					if (resourceData.onsenKeyNumber) {
						updates.onsenKeyNumber = resourceData.onsenKeyNumber;
					}
					if (checkinData.comeFrom) {
						updates.comeFrom = checkinData.comeFrom;
					}
					// Add demographic data
					if (checkinData.maleCount !== undefined) updates.maleCount = checkinData.maleCount;
					if (checkinData.femaleCount !== undefined) updates.femaleCount = checkinData.femaleCount;
					if (checkinData.totalAdultCount !== undefined) updates.totalAdultCount = checkinData.totalAdultCount;
					if (checkinData.boyCount !== undefined) updates.boyCount = checkinData.boyCount;
					if (checkinData.girlCount !== undefined) updates.girlCount = checkinData.girlCount;
					if (checkinData.totalChildCount !== undefined) updates.totalChildCount = checkinData.totalChildCount;
					if (checkinData.kidsCount !== undefined) updates.kidsCount = checkinData.kidsCount;
					if (checkinData.faceTowelCount !== undefined) updates.faceTowelCount = checkinData.faceTowelCount;
					if (checkinData.bathTowelCount !== undefined) updates.bathTowelCount = checkinData.bathTowelCount;
				}
			}

			// Apply updates to Google Sheets
			await updateSheetsRow(sheets, env.GOOGLE_SPREADSHEET_ID, updates, columnMap, rowIndex);

			console.log(
				`Successfully updated rental ${checkinData.rentalID} in Google Sheets - Status: ${resourceData.nextStatus}`
			);
		} catch (sheetsError) {
			console.error('Google Sheets update error:', sheetsError);
			return json(
				{
					success: false,
					error: 'Database update failed',
					message: 'Check-in processed but failed to update rental record',
					details: sheetsError.message
				},
				{ status: 500 }
			);
		}

		// Log the check-in for audit purposes
		const staffInfo = serviceType !== 'Luggage' ? checkinData.staffName : 'System (Luggage)';
		console.log(
			`Rental ${checkinData.rentalID} checked in by ${staffInfo} - Service: ${serviceType}, Status: ${resourceData.nextStatus}`
		);

		// Success response with different messages based on service type
		const responseMessage =
			serviceType === 'Luggage'
				? 'Check-in completed. Rental moved to storage queue.'
				: 'Check-in completed. Rental is now active.';

		return json({
			success: true,
			rentalID: checkinData.rentalID,
			message: responseMessage,
			checkin: {
				staffName: serviceType !== 'Luggage' ? checkinData.staffName : 'System',
				checkedInAt: new Date().toISOString(),
				newStatus: resourceData.nextStatus,
				serviceType: serviceType,
				photoUploaded: !!photoFileId,
				photoFileId: photoFileId,
				...(resourceData.bikeNumber && { bikeNumbers: checkinData.bikeNumbers }),
				...(resourceData.onsenKeyNumber && { onsenKeyNumbers: checkinData.onsenKeyNumbers }),
				...(resourceData.luggageTagNumbers &&
					resourceData.luggageTagNumbers.length > 0 && {
						luggageTagNumbers: checkinData.luggageTagNumbers
					})
			},
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return handleApiError(error, 'Check-in API');
	}
}

// Handle unsupported methods
/** @type {import('./$types').RequestHandler} */
export async function GET() {
	return handleMethodNotAllowed('POST', 'Process rental check-in and resource assignment');
}

/** @type {import('./$types').RequestHandler} */
export async function PUT() {
	return handleMethodNotAllowed('POST');
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE() {
	return handleMethodNotAllowed('POST');
}
