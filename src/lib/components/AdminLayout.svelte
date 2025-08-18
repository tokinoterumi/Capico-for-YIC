<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import AwaitingStorageWidget from '$lib/components/AwaitingStorageWidget.svelte';
	import StaffWidget from '$lib/components/StaffWidget.svelte';

	export let title = '管理パネル - Capico for YIC';
	export let showAwaitingWidget = true;
	export let session;

	let awaitingStorageWidget;

	// Expose refresh function to parent components
	export function refreshAwaitingStorage() {
		if (awaitingStorageWidget) {
			awaitingStorageWidget.refreshNow();
		}
	}

	// Expose optimistic update function
	export function addToAwaitingStorageOptimistically(rental) {
		if (awaitingStorageWidget) {
			awaitingStorageWidget.addItemOptimistically(rental);
		}
	}

	let currentUser = '';
	let isFloorView = false;
	let notifications = [];
	let awaitingStorageCount = 0;
	let staffCount = 0;

	// Check if this is the floor staff view
	$: isFloorView = $page.url.pathname === '/admin/floor';

	// Get user information from session
	$: if (session?.user) {
		const email = session.user.email;
		const name = session.user.name;
		currentUser = name || email?.split('@')[0] || 'スタッフ';
	}

	onMount(() => {
		// Load initial notifications
		loadNotifications();

		// Set up periodic updates for real-time functionality
		const interval = setInterval(() => {
			loadNotifications();
		}, 30000); // Update every 30 seconds

		return () => clearInterval(interval);
	});

	async function loadNotifications() {
		// This would connect to your notification system
		// For now, we'll simulate some notifications
		notifications = [
			// Add real-time notifications here
		];
	}

	function handleAwaitingCountUpdate(event) {
		awaitingStorageCount = event.detail.count;
	}

	function handleStaffCountUpdate(event) {
		staffCount = event.detail.count;
	}

	function navigateToFloorView() {
		window.location.href = '/admin/floor';
	}

	function navigateToMainAdmin() {
		window.location.href = '/admin';
	}

	function logout() {
		window.location.href = '/auth/signout';
	}
</script>

<div class="admin-container">
	<!-- Header -->
	<header class="admin-header">
		<div class="flex items-center justify-between">
			<!-- Logo and Title -->
			<div class="flex items-center space-x-4">
				<div class="flex items-center space-x-2">
					<div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
						<svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
							<path d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5z" />
							<path d="M9 21V12h2v9" />
						</svg>
					</div>
					<h1 class="text-xl font-bold text-gray-900">{title}</h1>
				</div>

				<!-- View Toggle -->
				{#if !isFloorView}
					<button
						on:click={navigateToFloorView}
						class="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
					>
						フロアビュー<br />Floor View
					</button>
				{:else}
					<button
						on:click={navigateToMainAdmin}
						class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
					>
						← メイン管理<br />Main Admin
					</button>
				{/if}
			</div>

			<!-- Status and User Info -->
			<div class="flex items-center space-x-4">
				<!-- Awaiting Storage Counter -->
				{#if !isFloorView && awaitingStorageCount > 0}
					<div class="flex items-center space-x-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-md">
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
								clip-rule="evenodd"
							/>
						</svg>
						<span class="text-sm font-medium">
							保管待ち: {awaitingStorageCount}
						</span>
					</div>
				{/if}

				<!-- Notifications -->
				{#if notifications.length > 0}
					<div class="relative">
						<button
							class="p-2 text-gray-400 hover:text-gray-500"
							aria-label="通知<br>Notifications"
						>
							<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
								<path
									d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"
								/>
							</svg>
						</button>
						<div
							class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"
						></div>
					</div>
				{/if}

				<!-- User Menu -->
				<div class="flex items-center space-x-3">
					<div class="text-right">
						<div class="text-sm font-medium text-gray-900">{currentUser}</div>
						<div class="text-xs text-gray-500">
							{new Date().toLocaleDateString('ja-JP')}
							{new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
						</div>
					</div>
					<button
						on:click={logout}
						class="p-2 text-gray-400 hover:text-gray-500"
						title="ログアウト<br>Logout"
						aria-label="ログアウト<br>Logout"
					>
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content Area -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Main Content -->
		<main class="flex-1 overflow-auto">
			<div class="admin-content">
				<slot />
			</div>
		</main>

		<!-- Sidebar Widgets (only on main admin view) -->
		{#if showAwaitingWidget && !isFloorView}
			<aside class="admin-sidebar-width border-l border-gray-200 bg-gray-50 overflow-y-auto">
				<div class="p-4 space-y-6">
					<!-- Awaiting Storage Widget -->
					<div>
						<div class="flex items-center justify-between mb-4">
							<h2 class="text-lg font-semibold text-gray-900">保管待ち</h2>
							<span class="text-sm text-gray-500"> Awaiting Storage </span>
						</div>
						<AwaitingStorageWidget
							bind:this={awaitingStorageWidget}
							on:countUpdate={handleAwaitingCountUpdate}
						/>
					</div>

					<!-- Staff Widget -->
					<div>
						<StaffWidget on:countUpdate={handleStaffCountUpdate} />
					</div>
				</div>
			</aside>
		{/if}
	</div>

	<!-- Footer -->
	<footer class="border-t border-gray-200 bg-white px-6 py-3">
		<div class="flex items-center justify-between text-sm text-gray-500">
			<div>
				© 2025 Yamanouchi Information Center. Created by Terumi Tokino. All rights reserved.
			</div>
			<div class="flex items-center space-x-4">
				<span>Version 4.3</span>
			</div>
		</div>
	</footer>
</div>

<style>
	.admin-container {
		@apply min-h-screen bg-gray-50 flex flex-col;
	}

	.admin-header {
		@apply bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0;
	}

	.admin-content {
		@apply p-6;
	}

	.admin-sidebar-width {
		width: 280px;
		flex-shrink: 0;
	}

	/* Responsive adjustments */
	@media (max-width: 1024px) {
		.admin-sidebar-width {
			display: none;
		}
	}

	/* PWA-specific styles */
	@media (display-mode: standalone) {
		.admin-container {
			padding-top: env(safe-area-inset-top);
			padding-bottom: env(safe-area-inset-bottom);
		}
	}
</style>
