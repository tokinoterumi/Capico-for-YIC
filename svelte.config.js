import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter(),
		
		// Configure service worker for PWA functionality
		serviceWorker: {
			register: false, // We'll manually register for better control
			files: (filepath) => !/\.DS_Store/.test(filepath)
		},
		
		// Configure CSP for Google Apps Script integration
		csp: {
			mode: 'auto',
			directives: {
				'script-src': ['self', 'unsafe-inline', 'https://script.google.com', 'https://script.googleusercontent.com'],
				'connect-src': ['self', 'https://script.google.com', 'https://script.googleusercontent.com'],
				'img-src': ['self', 'data:', 'https:', 'blob:'],
				'frame-src': ['https://script.google.com']
			}
		},
		
		// Alias configuration for cleaner imports
		alias: {
			$components: 'src/lib/components',
			$stores: 'src/lib/stores',
			$utils: 'src/lib/utils',
			$types: 'src/lib/types'
		}
	}
};

export default config;