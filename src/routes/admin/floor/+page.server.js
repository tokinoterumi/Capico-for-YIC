import { redirect } from '@sveltejs/kit';

export async function load({ locals, url }) {
	const session = await locals.auth();
	
	if (!session?.user) {
		// Use Auth.js built-in signin endpoint
		throw redirect(302, `/auth/signin?provider=google&callbackUrl=${encodeURIComponent(url.pathname)}`);
	}
	
	const userEmail = session.user.email;
	if (!userEmail || !userEmail.endsWith('@info-yamanouchi.net')) {
		throw redirect(302, '/auth-error?error=AccessDenied');
	}
	
	return {
		session
	};
}