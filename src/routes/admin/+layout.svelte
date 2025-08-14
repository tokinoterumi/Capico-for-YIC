<script>
	import { page } from '$app/stores';
</script>

<svelte:head>
	<!-- Override global manifest with admin-specific one -->
	<link rel="manifest" href="/admin-manifest.json" />
	<meta name="theme-color" content="#dc2626" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Capico Admin" />
	<link rel="apple-touch-icon" sizes="180x180" href="/Capico.png" />
</svelte:head>

<main>
	<slot />
</main>