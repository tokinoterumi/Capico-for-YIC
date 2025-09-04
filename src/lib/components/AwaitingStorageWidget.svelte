<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import CheckinModal from '$lib/components/CheckinModal.svelte';

	export let onCountUpdate: ((event: { detail: { count: number } }) => void) | null = null;

	// Expose refresh function to parent components
	export function refreshNow() {
		loadAwaitingItems(false);
	}

	// Optimistic update function - adds item immediately to UI
	export function addItemOptimistically(rental) {
		if (rental.serviceType !== 'Luggage') return;

		// Create optimistic item from rental data
		const optimisticItem: AwaitingItem = {
			rentalID: rental.rentalID,
			customerName: rental.customerName,
			serviceType: rental.serviceType,
			luggageCount: rental.luggageCount || 1,
			luggageTagNumber: rental.luggageTagNumber || '', // This will be updated from checkin data
			submittedAt: new Date().toISOString(),
			hotelName: rental.partnerHotel || null,
			guestName: rental.customerName, // For hotel partnerships
			isHotelPartnership: !!rental.partnerHotel,
			isOptimistic: true // Mark as optimistic
		};

		// Add to beginning of list (most recent first)
		awaitingItems = [optimisticItem, ...awaitingItems];

		// Update count immediately
		if (onCountUpdate) {
			onCountUpdate({ detail: { count: awaitingItems.length } });
		}

		// Schedule a background refresh to sync with real data
		setTimeout(() => {
			loadAwaitingItems(false);
		}, 2000); // Refresh after 2 seconds to sync
	}

	interface AwaitingItem {
		rentalID: string;
		customerName: string;
		serviceType: string;
		luggageCount?: number;
		luggageTagNumber?: string;
		submittedAt: string;
		hotelName?: string;
		guestName?: string;
		isHotelPartnership?: boolean;
		isOptimistic?: boolean; // Flag to indicate optimistic items
	}

	let awaitingItems: AwaitingItem[] = [];
	let loading = true;
	let error: string | null = null;
	let selectedRental: any | null = null; // Compatible with CheckinModal's Rental interface
	let showCheckinModal = false;

	onMount(() => {
		loadAwaitingItems();

		// Set up periodic refresh every 30 seconds
		const interval = setInterval(() => {
			loadAwaitingItems(false); // Silent refresh
		}, 30000);

		return () => clearInterval(interval);
	});

	async function loadAwaitingItems(showLoading = true) {
		if (!browser) return;

		if (showLoading) loading = true;
		error = null;

		try {
			const response = await fetch('/api/rentals?status=Pending&serviceType=Luggage');

			if (!response.ok) {
				throw new Error('Failed to fetch awaiting storage items');
			}

			const data = await response.json();

			// When loading real data, remove optimistic items and replace with real data
			awaitingItems = data.rentals || [];

			// Emit count update to parent
			if (onCountUpdate) {
				onCountUpdate({ detail: { count: awaitingItems.length } });
			}
		} catch (err) {
			console.error('Error loading awaiting items:', err);
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	function handleCheckin(item: AwaitingItem) {
		// Convert AwaitingItem to CheckinModal-compatible rental object
		selectedRental = {
			rentalID: item.rentalID,
			serviceType: item.serviceType,
			customerName: item.customerName,
			luggageCount: item.luggageCount || 1,
			totalPrice: undefined, // Not needed for luggage checkin
			bikeCount: undefined,
			totalAdultCount: undefined,
			totalChildCount: undefined
		};
		showCheckinModal = true;
	}

	function handleCheckinSuccess() {
		showCheckinModal = false;
		selectedRental = null;
		// Refresh the list to remove checked-in item
		loadAwaitingItems(false);
	}

	function handleCheckinCancel() {
		showCheckinModal = false;
		selectedRental = null;
	}

	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleTimeString('ja-JP', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getItemIcon(serviceType: string): string {
		switch (serviceType) {
			case 'Luggage':
				return '🧳';
			default:
				return '📦';
		}
	}

	// Calculate how long item has been waiting
	function getWaitingTime(submittedAt: string): string {
		const now = new Date();
		const submitted = new Date(submittedAt);
		const diffMinutes = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60));

		if (diffMinutes < 60) {
			return `${diffMinutes}分`;
		} else {
			const hours = Math.floor(diffMinutes / 60);
			const minutes = diffMinutes % 60;
			return `${hours}時間${minutes > 0 ? minutes + '分' : ''}`;
		}
	}

	function getUrgencyClass(submittedAt: string): string {
		const now = new Date();
		const submitted = new Date(submittedAt);
		const diffMinutes = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60));

		if (diffMinutes > 30) {
			return 'border-l-red-500 bg-red-50';
		} else if (diffMinutes > 15) {
			return 'border-l-orange-500 bg-orange-50';
		} else {
			return 'border-l-blue-500 bg-blue-50';
		}
	}
</script>

<div class="h-full flex flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center space-x-2">
			{#if awaitingItems.length > 0}
				<span
					class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
				>
					{awaitingItems.length}件
				</span>
			{/if}
		</div>
		<button
			on:click={() => loadAwaitingItems()}
			class="p-1 text-gray-400 hover:text-gray-600"
			disabled={loading}
			aria-label="更新 / Refresh"
		>
			<svg class="w-4 h-4 {loading ? 'animate-spin' : ''}" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto">
		{#if loading && awaitingItems.length === 0}
			<!-- Loading State -->
			<div class="flex items-center justify-center py-8">
				<div class="loading-spinner"></div>
				<span class="ml-2 text-sm text-gray-500">読み込み中...</span>
			</div>
		{:else if error}
			<!-- Error State -->
			<div class="bg-red-50 border border-red-200 rounded-lg p-3">
				<div class="flex items-center">
					<svg class="w-4 h-4 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					</svg>
					<div>
						<h4 class="text-sm font-medium text-red-800">エラー</h4>
						<p class="text-xs text-red-700">{error}</p>
					</div>
				</div>
			</div>
		{:else if awaitingItems.length === 0}
			<!-- Empty State -->
			<div class="text-center py-8">
				<div
					class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"
				>
					<svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1-2H8l-1 2H5V5z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<p class="text-sm text-gray-500 mb-1">保管待ちなし</p>
				<p class="text-xs text-gray-400">No items awaiting check-in</p>
			</div>
		{:else}
			<!-- Awaiting Items List -->
			<div class="space-y-3">
				{#each awaitingItems as item (item.rentalID)}
					<div
						class="border-l-4 {getUrgencyClass(
							item.submittedAt
						)} border border-gray-200 rounded-lg p-3 transition-all duration-200 hover:shadow-sm {item.isOptimistic
							? 'bg-blue-25 border-dashed animate-pulse'
							: ''}"
					>
						<!-- Item Header -->
						<div class="flex items-start justify-between mb-2">
							<div class="flex items-center space-x-2">
								<span class="text-lg">{getItemIcon(item.serviceType)}</span>
								<div>
									<div class="flex items-center space-x-2">
										<p class="font-medium text-sm text-gray-900">{item.rentalID}</p>
										{#if item.isOptimistic}
											<span class="text-xs text-blue-600 bg-blue-100 px-1 py-0.5 rounded">
												処理中
											</span>
										{/if}
									</div>
									<p class="text-xs text-gray-500">
										{getWaitingTime(item.submittedAt)}前
									</p>
								</div>
							</div>
							<button
								on:click={() => handleCheckin(item)}
								disabled={item.isOptimistic}
								class="px-2 py-1 text-xs rounded transition-colors {item.isOptimistic
									? 'bg-gray-300 text-gray-500 cursor-not-allowed'
									: 'bg-blue-600 text-white hover:bg-blue-700'}"
							>
								{item.isOptimistic ? '待機' : 'チェックイン'}
							</button>
						</div>

						<!-- Customer Info -->
						<div class="space-y-1">
							{#if item.isHotelPartnership}
								<div class="flex items-center space-x-1">
									<svg class="w-3 h-3 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
										<path
											d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"
										/>
									</svg>
									<p class="text-xs text-purple-700 font-medium">{item.hotelName}</p>
								</div>
								{#if item.guestName}
									<p class="text-xs text-gray-600">Guest: {item.guestName}</p>
								{/if}
							{:else}
								<p class="text-xs text-gray-600">{item.customerName}</p>
							{/if}

							{#if item.luggageTagNumber}
								<div class="flex items-center space-x-1">
									<svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
											clip-rule="evenodd"
										/>
									</svg>
									<p class="text-xs text-gray-600 font-mono">{item.luggageTagNumber}</p>
								</div>
							{/if}

							{#if item.luggageCount}
								<p class="text-xs text-gray-500">{item.luggageCount}個</p>
							{/if}
						</div>

						<!-- Time Info -->
						<div class="mt-2 pt-2 border-t border-gray-100">
							<p class="text-xs text-gray-400">
								登録: {formatTime(item.submittedAt)}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Footer Info -->
	{#if awaitingItems.length > 0}
		<div class="mt-4 pt-3 border-t border-gray-200">
			<div class="flex items-center justify-between text-xs text-gray-500">
				<span>30秒毎更新</span>
			</div>
		</div>
	{/if}
</div>

<!-- Checkin Modal -->
{#if showCheckinModal && selectedRental}
	<CheckinModal
		rental={selectedRental}
		show={showCheckinModal}
		onSuccess={handleCheckinSuccess}
		onClose={handleCheckinCancel}
	/>
{/if}
