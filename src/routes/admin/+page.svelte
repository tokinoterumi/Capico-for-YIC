<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import AdminLayout from '$lib/components/AdminLayout.svelte';

	export let data;
	import RentalCard from '$lib/components/RentalCard.svelte';
	import QueueFilter from '$lib/components/QueueFilter.svelte';
	import CheckinModal from '$components/CheckinModal.svelte';
	import CounterRegistrationModal from '$components/CounterRegistrationModal.svelte';
	import HotelLuggageModal from '$components/HotelLuggageModal.svelte';
	import TroubleModal from '$lib/components/TroubleModal.svelte';
	import DetailsModal from '$lib/components/DetailsModal.svelte';
	import CancelModal from '$lib/components/CancelModal.svelte';
	import ReturnModal from '$lib/components/ReturnModal.svelte';
	import EditModal from '$lib/components/EditModal.svelte';
	import ExportDateRangeModal from '$lib/components/ExportDateRangeModal.svelte';

	// === STATE VARIABLES ===
	let rentals = [];
	let adminLayout; // Reference to AdminLayout component
	let loading = true;
	let error = null;

	// Unified filter state
	let activeFilters = {
		status: 'all',
		serviceType: 'all',
		statsFilter: null // For tracking stats card clicks
	};

	// Modal states
	let showCheckinModal = false;
	let showCancelModal = false;
	let showTroubleModal = false;
	let showDetailsModal = false;
	let showReturnModal = false;
	let showCounterRegistrationModal = false;
	let showHotelLuggageModal = false;
	let showExportDateRangeModal = false;
	let showEditModal = false;
	let selectedRental = null;

	// Statistics
	let stats = {
		pending: 0,
		active: 0,
		troubled: 0,
		todayTotal: {
			total: 0,
			bike: 0,
			onsen: 0,
			luggage: 0
		},
		todayRevenue: {
			total: 0,
			bike: 0,
			onsen: 0,
			luggage: 0
		}
	};

	// === LIFECYCLE ===
	onMount(() => {
		if (browser) {
			loadRentals();

			// Set up periodic refresh every 10 seconds for better responsiveness
			const interval = setInterval(() => {
				loadRentals(false); // Silent refresh
			}, 10000); // Reduced from 30s to 10s

			return () => clearInterval(interval);
		}
	});

	// === DATA LOADING ===
	async function loadRentals(showLoading = true) {
		if (!browser) return;

		if (showLoading) loading = true;
		error = null;

		try {
			const response = await fetch('/api/rentals');
			if (!response.ok) throw new Error('Failed to fetch rentals');

			const data = await response.json();

			// Clean and validate rentals data
			rentals = (data.rentals || []).filter(
				(rental) => rental && typeof rental === 'object' && rental.status && rental.rentalID
			);

			updateStats();
		} catch (err) {
			console.error('Error loading rentals:', err);
			error = err.message;
			rentals = [];
		} finally {
			loading = false;
		}
	}

	// === STATISTICS ===
	function updateStats() {
		const today = new Date().toDateString();
		const todayRentals = rentals.filter(
			(r) => r.submittedAt && new Date(r.submittedAt).toDateString() === today
		);

		stats = {
			pending: rentals.filter((r) => r.status === 'Pending').length,
			active: rentals.filter((r) => r.status === 'Active').length,
			troubled: rentals.filter((r) => r.status === 'Troubled').length,
			todayTotal: {
				total: todayRentals.length,
				bike: todayRentals.filter((r) => r.serviceType === 'Bike').length,
				onsen: todayRentals.filter((r) => r.serviceType === 'Onsen').length,
				luggage: todayRentals.filter((r) => r.serviceType === 'Luggage').length
			},
			todayRevenue: {
				total: todayRentals.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0),
				bike: todayRentals
					.filter((r) => r.serviceType === 'Bike')
					.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0),
				onsen: todayRentals
					.filter((r) => r.serviceType === 'Onsen')
					.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0),
				luggage: todayRentals
					.filter((r) => r.serviceType === 'Luggage')
					.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0)
			}
		};
	}

	// === FILTERING LOGIC ===
	function applyFilters(rentalsToFilter = rentals) {
		return rentalsToFilter.filter((rental) => {
			// Status filter (from QueueFilter component)
			if (activeFilters.status !== 'all' && rental.status !== activeFilters.status) {
				return false;
			}

			// Service type filter (from QueueFilter component)
			if (activeFilters.serviceType !== 'all' && rental.serviceType !== activeFilters.serviceType) {
				return false;
			}

			// Stats card filter (overrides other status filters)
			if (activeFilters.statsFilter) {
				switch (activeFilters.statsFilter) {
					case 'pending':
						return rental.status === 'Pending';
					case 'active':
						return rental.status === 'Active';
					case 'troubled':
						return rental.status === 'Troubled';
					default:
						return true;
				}
			}

			return true;
		});
	}

	// === EVENT HANDLERS ===

	// Stats card click handler
	function handleStatsCardClick(filterType) {
		if (activeFilters.statsFilter === filterType) {
			// Clear stats filter if clicking the same card
			activeFilters.statsFilter = null;
		} else {
			// Set new stats filter
			activeFilters.statsFilter = filterType;
		}

		// Trigger reactivity
		activeFilters = { ...activeFilters };
	}

	// QueueFilter component handler
	function handleFilterChange(event) {
		const newFilters = event.detail;
		activeFilters = {
			...activeFilters,
			status: newFilters.status || 'all',
			serviceType: newFilters.serviceType || 'all',
			// Clear stats filter when using regular filters
			statsFilter: null
		};
	}

	// Clear all filters
	function clearAllFilters() {
		activeFilters = {
			status: 'all',
			serviceType: 'all',
			statsFilter: null
		};
	}

	// === RENTAL ACTION HANDLERS ===
	function handleCheckin(rental) {
		selectedRental = rental;
		showCheckinModal = true;
	}

	function handleCancel(rental) {
		selectedRental = rental;
		showCancelModal = true;
	}

	function handleReturn(rental) {
		selectedRental = rental;
		showReturnModal = true;
	}

	function handleTrouble(rental) {
		selectedRental = rental;
		showTroubleModal = true;
	}

	function handleViewDetails(rental) {
		selectedRental = rental;
		showDetailsModal = true;
	}

	function handleEdit(rental) {
		selectedRental = rental;
		showEditModal = true;
	}

	function handleResolve(rental) {
		processResolve(rental);
	}

	function handleMoveToActive(rental) {
		processMoveToActive(rental);
	}


	// === QUICK ACTIONS ===
	function showCounterRegistration() {
		showCounterRegistrationModal = true;
	}

	function showHotelLuggage() {
		showHotelLuggageModal = true;
	}

	// === API ACTIONS ===

	function showExportModal() {
		showExportDateRangeModal = true;
	}

	async function exportOnsenData(dateRange = null) {
		try {
			let url = '/api/export/onsen';
			if (dateRange) {
				const params = new URLSearchParams({
					startDate: dateRange.startDate,
					endDate: dateRange.endDate
				});
				url += `?${params.toString()}`;
			}

			const response = await fetch(url);

			if (!response.ok) {
				const errorData = await response.json();
				alert(`エラー: ${errorData.message || 'データの出力に失敗しました'}`);
				return;
			}

			// Create download link for the Excel file
			const blob = await response.blob();
			const downloadUrl = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = downloadUrl;

			// Get filename from response headers or generate one
			const contentDisposition = response.headers.get('Content-Disposition');
			let filename = 'onsen-data.xlsx';
			if (contentDisposition) {
				const filenameMatch = contentDisposition.match(/filename="(.+)"/);
				if (filenameMatch) {
					filename = filenameMatch[1];
				}
			}

			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(downloadUrl);

			alert('外湯めぐり利用データの出力が完了しました');
		} catch (err) {
			console.error('Export error:', err);
			alert('データ出力中にエラーが発生しました');
		}
	}

	async function processMoveToActive(rental) {
		try {
			const response = await fetch('/api/move-to-active', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					rentalID: rental.rentalID,
					storageLocation: 'Area A - Front',
					notes: '保管完了'
				})
			});

			if (response.ok) {
				await loadRentals();
				alert('保管が完了しました');
			} else {
				const error = await response.json();
				alert(`エラー: ${error.message}`);
			}
		} catch (err) {
			console.error('Move to active error:', err);
			alert('保管完了処理中にエラーが発生しました');
		}
	}

	async function processResolve(rental) {
		// Show confirmation dialog
		const confirmed = confirm(
			`トラブルを解決済みとしてマークしますか？\nMark as solved?\n\nレンタルID: ${rental.rentalID}\nお客様: ${rental.customerName}`
		);

		if (!confirmed) return;

		try {
			const response = await fetch('/api/resolve-trouble', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					rentalID: rental.rentalID,
					notes: 'トラブル解決済み'
				})
			});

			if (response.ok) {
				await loadRentals();
				alert('トラブルが解決済みとして処理されました');
			} else {
				const error = await response.json();
				alert(`エラー: ${error.message}`);
			}
		} catch (err) {
			console.error('Resolve trouble error:', err);
			alert('トラブル解決処理中にエラーが発生しました');
		}
	}

	// === MODAL MANAGEMENT ===
	function closeAllModals() {
		showCheckinModal = false;
		showCancelModal = false;
		showTroubleModal = false;
		showDetailsModal = false;
		showReturnModal = false;
		showCounterRegistrationModal = false;
		showHotelLuggageModal = false;
		showExportDateRangeModal = false;
		showEditModal = false;
		selectedRental = null;
	}

	// === REACTIVE STATEMENTS ===

	// Apply filters whenever rentals or filters change (client-side only to prevent hydration mismatch)
	$: filteredRentals = browser
		? applyFilters(rentals).sort(
				(a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
			)
		: [];

	// Group filtered rentals by status (client-side only)
	$: groupedRentals = browser
		? {
				pending: filteredRentals.filter((r) => r.status === 'Pending'),
				awaitingStorage: filteredRentals.filter((r) => r.status === 'Awaiting_Storage'),
				active: filteredRentals.filter((r) => r.status === 'Active'),
				troubled: filteredRentals.filter((r) => r.status === 'Troubled'),
				closed: filteredRentals.filter(
					(r) =>
						r.status === 'Closed' || r.status === 'Closed (Picked Up)' || r.status === 'Completed'
				)
			}
		: {
				pending: [],
				awaitingStorage: [],
				active: [],
				troubled: [],
				closed: []
			};

	// Determine if we have any active filters
	$: hasActiveFilters =
		activeFilters.status !== 'all' ||
		activeFilters.serviceType !== 'all' ||
		activeFilters.statsFilter !== null;
</script>

<svelte:head>
	<title>管理パネル - YIC</title>
</svelte:head>

<!-- MODALS -->
{#if showCheckinModal}
	<CheckinModal
		show={showCheckinModal}
		rental={selectedRental}
		onClose={closeAllModals}
		onSuccess={() => {
			closeAllModals();
			loadRentals();
			// Add to awaiting storage widget immediately for luggage check-ins (optimistic update)
			if (selectedRental?.serviceType === 'Luggage' && adminLayout) {
				adminLayout.addToAwaitingStorageOptimistically(selectedRental);
			}
		}}
	/>
{/if}

{#if showCancelModal}
	<CancelModal
		show={showCancelModal}
		rental={selectedRental}
		onClose={closeAllModals}
		onSuccess={() => {
			closeAllModals();
			loadRentals();
		}}
	/>
{/if}

{#if showTroubleModal}
	<TroubleModal
		show={showTroubleModal}
		rental={selectedRental}
		onClose={closeAllModals}
		onSuccess={() => {
			closeAllModals();
			loadRentals();
		}}
	/>
{/if}

{#if showDetailsModal}
	<DetailsModal show={showDetailsModal} rental={selectedRental} onClose={closeAllModals} />
{/if}

{#if showReturnModal}
	<ReturnModal
		show={showReturnModal}
		rental={selectedRental}
		onClose={closeAllModals}
		onSuccess={() => {
			closeAllModals();
			loadRentals();
		}}
	/>
{/if}

{#if showEditModal}
	<EditModal
		show={showEditModal}
		rental={selectedRental}
		onClose={closeAllModals}
		onSuccess={() => {
			closeAllModals();
			loadRentals();
		}}
	/>
{/if}

<AdminLayout bind:this={adminLayout} title="管理パネル　Admin Panel" session={data.session}>
	<!-- Stats Overview -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-5 mb-6">
		<!-- Pending Card -->
		<div
			class="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all duration-200 {activeFilters.statsFilter ===
			'pending'
				? 'ring-2 ring-amber-400 bg-amber-50'
				: ''}"
			on:click={() => handleStatsCardClick('pending')}
			role="button"
			tabindex="0"
			on:keydown={(e) => e.key === 'Enter' && handleStatsCardClick('pending')}
		>
			<div class="text-2xl font-bold text-amber-600">{stats.pending}</div>
			<div class="text-sm text-gray-600">保留中</div>
		</div>


		<!-- Active Card -->
		<div
			class="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-green-300 transition-all duration-200 {activeFilters.statsFilter ===
			'active'
				? 'ring-2 ring-green-400 bg-green-50'
				: ''}"
			on:click={() => handleStatsCardClick('active')}
			role="button"
			tabindex="0"
			on:keydown={(e) => e.key === 'Enter' && handleStatsCardClick('active')}
		>
			<div class="text-2xl font-bold text-green-600">{stats.active}</div>
			<div class="text-sm text-gray-600">アクティブ</div>
		</div>

		<!-- Troubled Card -->
		<div
			class="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-red-300 transition-all duration-200 {activeFilters.statsFilter ===
			'troubled'
				? 'ring-2 ring-red-400 bg-red-50'
				: ''}"
			on:click={() => handleStatsCardClick('troubled')}
			role="button"
			tabindex="0"
			on:keydown={(e) => e.key === 'Enter' && handleStatsCardClick('troubled')}
		>
			<div class="text-2xl font-bold text-red-600">{stats.troubled}</div>
			<div class="text-sm text-gray-600">トラブル</div>
		</div>

		<!-- Today Total Card (Non-clickable with breakdown) -->
		<div class="p-4">
			<div class="text-2xl font-bold text-blue-600">{stats.todayTotal.total}</div>
			<div class="text-sm text-gray-600 mb-3">今日の件数</div>

			<div class="space-y-2">
				<div class="flex justify-between items-center text-xs">
					<span class="text-gray-500 flex items-center flex-shrink-0">
						<span class="text-sm mr-1">🚲</span>
						<span class="truncate">サイクル</span>
					</span>
					<span class="font-medium text-gray-700 flex-shrink-0">{stats.todayTotal.bike}</span>
				</div>
				<div class="flex justify-between items-center text-xs">
					<span class="text-gray-500 flex items-center flex-shrink-0">
						<span class="text-sm mr-1">♨️</span>
						手形
					</span>
					<span class="font-medium text-gray-700 flex-shrink-0">{stats.todayTotal.onsen}</span>
				</div>
				<div class="flex justify-between items-center text-xs">
					<span class="text-gray-500 flex items-center flex-shrink-0">
						<span class="text-sm mr-1">🧳</span>
						<span class="truncate">荷物</span>
					</span>
					<span class="font-medium text-gray-700 flex-shrink-0">{stats.todayTotal.luggage}</span>
				</div>
			</div>
		</div>

		<!-- Today Revenue Card (Non-clickable with breakdown) -->
		<div class="p-4">
			<div class="text-2xl font-bold text-purple-600">
				¥{stats.todayRevenue.total.toLocaleString()}
			</div>
			<div class="text-sm text-gray-600 mb-3">今日の売上</div>

			<div class="space-y-2">
				<div class="flex justify-between items-center text-xs">
					<span class="text-gray-500 flex items-center flex-shrink-0">
						<span class="text-sm mr-1">🚲</span>
						レンタサイクル
					</span>
					<span class="font-medium text-gray-700 flex-shrink-0">¥{stats.todayRevenue.bike.toLocaleString()}</span>
				</div>
				<div class="flex justify-between items-center text-xs">
					<span class="text-gray-500 flex items-center flex-shrink-0">
						<span class="text-sm mr-1">♨️</span>
						手形
					</span>
					<span class="font-medium text-gray-700 flex-shrink-0">¥{stats.todayRevenue.onsen.toLocaleString()}</span
					>
				</div>
				<div class="flex justify-between items-center text-xs">
					<span class="text-gray-500 flex items-center flex-shrink-0">
						<span class="text-sm mr-1">🧳</span>
						荷物お預かり
					</span>
					<span class="font-medium text-gray-700"
						>¥{stats.todayRevenue.luggage.toLocaleString()}</span
					>
				</div>
			</div>
		</div>
	</div>

	<!-- Actions Bar -->
	<div class="flex flex-wrap items-center justify-between gap-4 mb-6">
		<div class="flex items-center gap-4">
			<QueueFilter
				selectedServiceType={activeFilters.serviceType}
				on:filterChange={handleFilterChange}
			/>

			{#if hasActiveFilters}
				<button on:click={clearAllFilters} class="btn-secondary text-sm px-3 py-2">
					✕ フィルターをクリア
				</button>
			{/if}
		</div>

		<div class="flex gap-2">
			<button on:click={showCounterRegistration} class="btn-primary"> + カウンター登録 </button>
			<button on:click={showHotelLuggage} class="btn-secondary"> + お荷物保管代行 </button>
			<button
				on:click={showExportModal}
				class="btn-secondary flex items-center space-x-2 hover:bg-green-800 hover:text-slate-50"
				disabled={loading}
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
				<span>外湯めぐりデータ</span>
			</button>
			<button
				on:click={() => loadRentals()}
				class="btn-secondary flex items-center space-x-2"
				disabled={loading}
			>
				<svg
					class="w-4 h-4 {loading ? 'animate-spin' : ''}"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
						clip-rule="evenodd"
					/>
				</svg>
				<span>{loading ? '更新中...' : '更新'}</span>
			</button>
		</div>
	</div>

	<!-- Loading State -->
	{#if loading && rentals.length === 0}
		<div class="flex items-center justify-center py-12">
			<div class="loading-spinner"></div>
			<span class="ml-3 text-gray-600">データを読み込み中...</span>
		</div>
	{/if}

	<!-- Error State -->
	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
			<div class="flex items-center">
				<svg class="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
				<div>
					<h3 class="text-red-800 font-medium">エラーが発生しました</h3>
					<p class="text-red-700 text-sm">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Rental Queue Sections -->
	{#if !loading || rentals.length > 0}
		<!-- Pending Queue -->
		{#if groupedRentals.pending.length > 0}
			<section class="mb-8">
				<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
					<div class="w-3 h-3 bg-amber-400 rounded-full mr-3"></div>
					保留中<br />Pending ({groupedRentals.pending.length})
				</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each groupedRentals.pending as rental (rental.rentalID)}
						<RentalCard
							{rental}
							on:checkin={(e) => handleCheckin(e.detail)}
							on:edit={(e) => handleEdit(e.detail)}
							on:cancel={(e) => handleCancel(e.detail)}
							on:viewDetails={(e) => handleViewDetails(e.detail)}
						/>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Awaiting Storage Queue -->
		{#if groupedRentals.awaitingStorage.length > 0}
			<section class="mb-8">
				<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
					<div class="w-3 h-3 bg-indigo-400 rounded-full mr-3"></div>
					保管待ち<br />Awaiting Storage ({groupedRentals.awaitingStorage.length})
				</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each groupedRentals.awaitingStorage as rental (rental.rentalID)}
						<RentalCard
							{rental}
							on:moveToActive={(e) => handleMoveToActive(e.detail)}
							on:edit={(e) => handleEdit(e.detail)}
							on:viewDetails={(e) => handleViewDetails(e.detail)}
						/>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Active Queue -->
		{#if groupedRentals.active.length > 0}
			<section class="mb-8">
				<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
					<div class="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
					アクティブ<br />Active ({groupedRentals.active.length})
				</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each groupedRentals.active as rental (rental.rentalID)}
						<RentalCard
							{rental}
							on:return={(e) => handleReturn(e.detail)}
							on:trouble={(e) => handleTrouble(e.detail)}
							on:viewDetails={(e) => handleViewDetails(e.detail)}
						/>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Troubled Queue -->
		{#if groupedRentals.troubled.length > 0}
			<section class="mb-8">
				<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
					<div class="w-3 h-3 bg-red-400 rounded-full mr-3"></div>
					トラブル<br />Troubled ({groupedRentals.troubled.length})
				</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each groupedRentals.troubled as rental (rental.rentalID)}
						<RentalCard
							{rental}
							on:return={(e) => handleReturn(e.detail)}
							on:resolve={(e) => handleResolve(e.detail)}
							on:viewDetails={(e) => handleViewDetails(e.detail)}
						/>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Closed Queue (when filtered) -->
		{#if groupedRentals.closed.length > 0}
			<section class="mb-8">
				<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
					<div class="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
					完了<br />Closed ({groupedRentals.closed.length})
				</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each groupedRentals.closed as rental (rental.rentalID)}
						<RentalCard
							{rental}
							showActions={false}
							compact={true}
							on:viewDetails={(e) => handleViewDetails(e.detail)}
						/>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Empty State -->
		{#if filteredRentals.length === 0 && !loading}
			<div class="text-center py-12">
				<svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
						clip-rule="evenodd"
					/>
				</svg>
				<h3 class="text-lg font-medium text-gray-900 mb-2">
					{hasActiveFilters ? 'フィルター条件に一致するサービスがありません' : 'EMPTY'}
				</h3>
				<p class="text-gray-500 mb-4">
					{hasActiveFilters
						? 'フィルター条件を変更してお試しください'
						: '現在表示できるサービスがありません'}
				</p>
				{#if hasActiveFilters}
					<button on:click={clearAllFilters} class="btn-secondary mr-2"> クリア </button>
				{/if}
				<button on:click={showCounterRegistration} class="btn-primary"> 新規登録 </button>
			</div>
		{/if}
	{/if}

	{#if showCounterRegistrationModal}
		<CounterRegistrationModal
			show={showCounterRegistrationModal}
			on:close={() => (showCounterRegistrationModal = false)}
			on:success={() => {
				showCounterRegistrationModal = false;
				loadRentals();
			}}
		/>
	{/if}

	{#if showHotelLuggageModal}
		<HotelLuggageModal
			show={showHotelLuggageModal}
			on:close={() => (showHotelLuggageModal = false)}
			on:success={() => {
				showHotelLuggageModal = false;
				loadRentals();
			}}
		/>
	{/if}

	{#if showExportDateRangeModal}
		<ExportDateRangeModal
			show={showExportDateRangeModal}
			onClose={() => (showExportDateRangeModal = false)}
			onExport={exportOnsenData}
		/>
	{/if}
</AdminLayout>
