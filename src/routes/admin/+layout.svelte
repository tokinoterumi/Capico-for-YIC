<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	onMount(() => {
		// Remove global manifest and replace with admin manifest
		const globalManifest = document.querySelector('link[rel="manifest"][href*="manifest.json"]');
		if (globalManifest) {
			globalManifest.remove();
		}
		
		// Remove global theme color and replace with admin theme
		const globalTheme = document.querySelector('meta[name="theme-color"][content="#1e40af"]');
		if (globalTheme) {
			globalTheme.content = '#dc2626';
		}
		
		// Remove global app title and replace with admin title  
		const globalTitle = document.querySelector('meta[name="apple-mobile-web-app-title"][content="Tourist Rental"]');
		if (globalTitle) {
			globalTitle.content = 'Capico Admin';
		}
	});
</script>

<svelte:head>
	<!-- Admin-specific PWA configuration -->
	<link rel="manifest" href="/admin-manifest.json?v=1.1" />
	<meta name="theme-color" content="#dc2626" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Capico Admin" />
	<link rel="apple-touch-icon" sizes="180x180" href="/Capico.png" />
</svelte:head>

<main>
	<slot />
</main>
