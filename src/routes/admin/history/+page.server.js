import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	// Check if user is authenticated
	const session = await locals.auth();

	if (!session?.user?.email) {
		throw redirect(302, '/auth/signin');
	}

	return {
		session
	};
}