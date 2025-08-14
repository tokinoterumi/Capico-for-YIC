import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';
// Use '$env/static/private' for variables needed at startup
import {
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	AUTH_SECRET,
	ALLOWED_EMAIL_DOMAIN
} from '$env/static/private';

export const { handle: authHandle } = SvelteKitAuth({
	providers: [
		Google({
			clientId: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET,
			authorization: {
				params: {
					scope: 'openid email profile'
				}
			}
		})
	],
	secret: AUTH_SECRET,
	callbacks: {
		async signIn({ user, account }) {
			if (account?.provider === 'google') {
				const email = user.email;
				if (email && email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
					return true;
				}
				return false;
			}
			return true;
		},
		async jwt({ token, user }) {
			if (user) {
				token.email = user.email;
			}
			return token;
		},
		async session({ session, token }) {
			if (token.email) {
				session.user.email = token.email;
			}
			return session;
		}
	},
	pages: {
		error: '/auth-error'
	}
});

export const handle = authHandle;
