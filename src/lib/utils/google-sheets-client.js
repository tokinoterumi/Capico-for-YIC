/**
 * Google Sheets client utilities
 * Centralized authentication and client creation
 */

import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import { env } from '$env/dynamic/private';

// --- Credentials handling (singleton) ---
let CREDENTIALS = null;
let credentialsInitialized = false;

function initializeCredentials() {
	if (credentialsInitialized) return;

	const key_base64 = env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
	if (!key_base64) {
		console.error('CRITICAL: GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 not found in .env file.');
		CREDENTIALS = {};
	} else {
		try {
			const key_json_string = Buffer.from(key_base64, 'base64').toString('utf-8');
			CREDENTIALS = JSON.parse(key_json_string);
		} catch (error) {
			console.error('CRITICAL: Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY_BASE64.', error);
			CREDENTIALS = {};
		}
	}

	credentialsInitialized = true;
}

/**
 * Create and return a Google Sheets client
 * @returns {Promise<Object>} Google Sheets API client
 * @throws {Error} If credentials are not available
 */
export async function getGoogleSheetsClient() {
	initializeCredentials();

	if (!CREDENTIALS || Object.keys(CREDENTIALS).length === 0) {
		throw new Error('Google credentials not available');
	}

	const auth = new GoogleAuth({
		credentials: CREDENTIALS,
		scopes: ['https://www.googleapis.com/auth/spreadsheets']
	});

	const authClient = await auth.getClient();
	return google.sheets({ version: 'v4', auth: /** @type {any} */ (authClient) });
}

/**
 * Check if Google Sheets credentials are properly configured
 * @returns {boolean} True if credentials are available
 */
export function hasValidCredentials() {
	initializeCredentials();
	return CREDENTIALS && Object.keys(CREDENTIALS).length > 0;
}