/**
 * Standardized API error handling utilities
 * Reduces code duplication across API endpoints
 */

import { json } from '@sveltejs/kit';

/**
 * Create a standardized error response
 * @param {string} error - Error type
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Object} additionalData - Additional data to include
 * @returns {Response} - Standardized JSON error response
 */
function createErrorResponse(error, message, status, additionalData = {}) {
	return json(
		{
			success: false,
			error,
			message,
			...additionalData
		},
		{ status }
	);
}

/**
 * Handle common API errors with standardized responses
 * @param {Error} error - The error object to handle
 * @param {string} context - Context description for logging (e.g., 'Move-to-Active API')
 * @returns {Response} - Standardized JSON error response
 */
export function handleApiError(error, context = 'API') {
	console.error(`${context} Error:`, error);

	// Handle different types of errors
	if (error instanceof SyntaxError) {
		return createErrorResponse('Invalid JSON', 'Request body must be valid JSON', 400);
	}

	if (error.message && error.message.includes('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64')) {
		return createErrorResponse(
			'Configuration error',
			'Google Sheets authentication is not properly configured',
			500
		);
	}

	if (error.message && error.message.includes('spreadsheet')) {
		return createErrorResponse(
			'Google Sheets error',
			'Failed to access or update the spreadsheet',
			502
		);
	}

	// Generic server error
	return createErrorResponse(
		'Internal server error',
		`An unexpected error occurred during ${context.toLowerCase()} operation`,
		500,
		{ details: error.message }
	);
}

/**
 * Handle validation errors with standardized responses
 * @param {string} field - The field that failed validation
 * @param {string} message - Detailed error message
 * @param {any} additionalData - Additional data to include in response
 * @returns {Response} - Standardized JSON validation error response
 */
export function handleValidationError(field, message, additionalData = {}) {
	return createErrorResponse('Validation error', message, 400, { field, ...additionalData });
}

/**
 * Handle not found errors with standardized responses
 * @param {string} resource - The resource that was not found (e.g., 'Rental')
 * @param {string} identifier - The identifier used to search (e.g., rental ID)
 * @returns {Response} - Standardized JSON not found error response
 */
export function handleNotFoundError(resource, identifier) {
	return createErrorResponse(
		`${resource} not found`,
		`Could not find ${resource.toLowerCase()} with the specified identifier`,
		404,
		{ identifier }
	);
}

/**
 * Handle method not allowed errors with standardized responses
 * @param {string} allowedMethod - The allowed HTTP method
 * @param {string} description - Description of what the endpoint does
 * @returns {Response} - Standardized JSON method not allowed error response
 */
export function handleMethodNotAllowed(allowedMethod, description = '') {
	return createErrorResponse(
		'Method not allowed',
		`This endpoint only accepts ${allowedMethod} requests`,
		405,
		description ? { description } : {}
	);
}