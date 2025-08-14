// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				'surface-main': '#1A202C',
				'surface-subtle': '#2D3748',
				'text-main': '#F7FAFC',
				'text-muted': '#A0AEC0',
				'brand-primary': '#DD6B20', // Onsen
				'brand-accent': '#4A5568',
				'status-success': '#38A169',
				'status-danger': '#E53E3E',
				'service-bike': '#0EA5E9', // Bike (New)
				'service-luggage': '#0D9488' // Luggage
			},
			boxShadow: {
				'glow-bike': '0 0 12px 0 rgba(14, 165, 233, 0.3)', // 鮮やかなグロー
				'glow-onsen': '0 0 12px 0 rgba(221, 107, 32, 0.3)', // 温かいグロー
				'glow-luggage': '0 0 12px 0 rgba(13, 148, 136, 0.3)' // 落ち着いたグロー
			},
			fontFamily: {
				sans: ['Outfit', 'Kosugi', 'sans-serif']
			}
		},
		plugins: []
	}
};
