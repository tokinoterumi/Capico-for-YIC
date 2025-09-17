import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getServiceColumnMapping } from '$utils/sheet-columns';
import { getGoogleSheetsClient } from '$utils/google-sheets-client';
import { updateSheetsRow, findRentalRow } from '$utils/sheets-updater';
import { handleApiError, handleMethodNotAllowed } from '$utils/api-error-handler';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		// Parse the incoming request body
		const returnData = await request.json();

		// Validate required fields
		if (!returnData.rentalID) {
			return json(
				{
					error: 'Missing rental ID',
					message: 'rentalID is required to process return'
				},
				{ status: 400 }
			);
		}

		// First, get the current rental to validate return is allowed and determine service type
		const sheets = await getGoogleSheetsClient();
		const rentalData = await findRentalRow(sheets, env.GOOGLE_SPREADSHEET_ID, returnData.rentalID);

		if (!rentalData) {
			return json(
				{
					error: 'Rental not found',
					message: `Could not find rental with ID: ${returnData.rentalID}`,
					rentalID: returnData.rentalID
				},
				{ status: 404 }
			);
		}

		const { rowIndex, currentRental } = rentalData;

		// Check if rental can be returned
		if (currentRental.status !== 'Active') {
			return json(
				{
					error: 'Return not allowed',
					message: `Cannot process return for rental with status '${currentRental.status}'. Only Active rentals can be returned.`,
					currentStatus: currentRental.status
				},
				{ status: 409 }
			);
		}

		// Validate returnStaff requirement based on service type
		// Luggage service doesn't require staff (can be self-service pickup)
		if (currentRental.serviceType !== 'Luggage' && !returnData.returnStaff) {
			return json(
				{
					error: 'Missing staff information',
					message: `returnStaff is required for ${currentRental.serviceType} service returns`
				},
				{ status: 400 }
			);
		}

		// Calculate if return is late
		const now = new Date();
		const expectedReturn = new Date(currentRental.expectedReturn);
		const isLate = now > expectedReturn;
		const minutesLate = isLate ? Math.ceil((now - expectedReturn) / (1000 * 60)) : 0;

		// Determine final status based on service type
		const finalStatus =
			currentRental.serviceType === 'Luggage' ? 'Closed (Picked Up)' : 'Closed';

		// Service-specific validation and resource release
		const serviceType = currentRental.serviceType;
		let resourceReleaseData = {};

		if (serviceType === 'Bike') {
			// Validate bikes are being returned
			if (returnData.bikeNumbers && returnData.bikeNumbers.length > 0) {
				const assignedBikes = currentRental.bikeNumber
					? currentRental.bikeNumber.split(', ')
					: [];
				const returningBikes = returnData.bikeNumbers;

				// Check if all assigned bikes are being returned
				const missingBikes = assignedBikes.filter((bike) => !returningBikes.includes(bike));
				if (missingBikes.length > 0) {
					return json(
						{
							error: 'Incomplete bike return',
							message: `Missing bikes: ${missingBikes.join(', ')}`,
							assignedBikes,
							returningBikes,
							missingBikes
						},
						{ status: 400 }
					);
				}

				resourceReleaseData.bikesReturned = returningBikes;
			}
		} else if (serviceType === 'Onsen') {
			// Validate onsen keys are being returned
			if (returnData.onsenKeyNumbers && returnData.onsenKeyNumbers.length > 0) {
				const assignedKeys = currentRental.onsenKeyNumber
					? currentRental.onsenKeyNumber.split(', ')
					: [];
				const returningKeys = returnData.onsenKeyNumbers;

				// Check if all assigned keys are being returned
				const missingKeys = assignedKeys.filter((key) => !returningKeys.includes(key));
				if (missingKeys.length > 0) {
					return json(
						{
							error: 'Incomplete key return',
							message: `Missing onsen keys: ${missingKeys.join(', ')}`,
							assignedKeys,
							returningKeys,
							missingKeys
						},
						{ status: 400 }
					);
				}

				resourceReleaseData.keysReturned = returningKeys;
			}
		} else if (serviceType === 'Luggage') {
			// Luggage pickup - no additional verification required
			resourceReleaseData.luggagePickedUp = true;
		}

		// Get service-specific column mapping from shared utility
		const columnMap = getServiceColumnMapping(serviceType, 'RETURN');

		// Prepare service-specific updates
		let updates = {
			status: finalStatus,
			returnedAt: new Date().toISOString(),
			lastUpdated: new Date().toISOString()
		};

		// Add service-specific fields
		if (serviceType === 'Luggage') {
			// Luggage-specific updates (minimal fields only)
			if (returnData.returnNotes && returnData.returnNotes.trim()) {
				updates.returnNotes = returnData.returnNotes.trim();
			}
		} else {
			// Bike/Onsen updates (full fields including staff and condition tracking)
			updates.returnStaff = returnData.returnStaff;
			updates.goodCondition = returnData.goodCondition ? 'TRUE' : 'FALSE';
			updates.isLate = isLate ? 'TRUE' : 'FALSE';
			updates.minutesLate = minutesLate;
			updates.damageReported = returnData.goodCondition ? 'FALSE' : 'TRUE';
			updates.repairRequired = returnData.repairRequired ? 'TRUE' : 'FALSE';
			updates.replacementRequired = 'FALSE';

			// Only add returnNotes if provided
			if (returnData.returnNotes && returnData.returnNotes.trim()) {
				updates.returnNotes = returnData.returnNotes.trim();
			}
		}

		// Execute the update using shared utility
		await updateSheetsRow(sheets, env.GOOGLE_SPREADSHEET_ID, updates, columnMap, rowIndex);


		// Prepare service-specific response messages
		let serviceMessage = '';
		if (serviceType === 'Bike') {
			serviceMessage = 'Bike return completed successfully';
		} else if (serviceType === 'Onsen') {
			serviceMessage = 'Onsen pass return completed successfully';
		} else if (serviceType === 'Luggage') {
			serviceMessage = 'Luggage pickup completed successfully';
		}

		// Success response
		return json({
			success: true,
			rentalID: returnData.rentalID,
			message: serviceMessage,
			return: {
				serviceType,
				previousStatus: 'Active',
				newStatus: finalStatus,
				...(serviceType !== 'Luggage' && { returnStaff: returnData.returnStaff }),
				returnedAt: updates.returnedAt,
				...(serviceType !== 'Luggage' && { goodCondition: returnData.goodCondition }),
				...(returnData.returnNotes && { returnNotes: returnData.returnNotes }),
				customerName: currentRental.customerName,
				...(serviceType !== 'Luggage' && { isLate }),
				...(serviceType !== 'Luggage' && minutesLate > 0 && { minutesLate }),
				...resourceReleaseData
			},
			workflow: {
				completed: [
					'Customer registration',
					'Check-in and resource assignment',
					'Service delivery',
					'Return/pickup processing'
				],
				status: 'Rental lifecycle completed'
			},
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return handleApiError(error, 'Return API');
	}
}

// Handle unsupported methods
/** @type {import('./$types').RequestHandler} */
export async function GET() {
	return json(
		{
			error: 'Method not allowed',
			message: 'This endpoint only accepts POST requests',
			usage: {
				method: 'POST',
				description: 'Process returns/pickups from Active rental status',
				requiredFields: [
					'rentalID (active rental to return)'
				],
				conditionallyRequiredFields: {
					'returnStaff': 'Required for Bike and Onsen services, optional for Luggage (self-service allowed)'
				},
				conditionalFields: {
					Bike: ['bikeNumbers (array of bikes being returned)'],
					Onsen: ['onsenKeyNumbers (array of keys being returned)'],
					Luggage: []
				},
				optionalFields: [
					'goodCondition (boolean - true if item in good condition)',
					'returnNotes (return notes)'
				],
				statusTransitions: {
					Bike: 'Active → Closed',
					Onsen: 'Active → Closed',
					Luggage: 'Active → Closed (Picked Up)'
				},
				resourceRelease: 'Bikes and onsen keys become available for new rentals'
			}
		},
		{ status: 405 }
	);
}

/** @type {import('./$types').RequestHandler} */
export async function PUT() {
	return handleMethodNotAllowed('POST');
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE() {
	return handleMethodNotAllowed('POST');
}
