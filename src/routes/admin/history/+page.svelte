<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import AdminLayout from '$lib/components/AdminLayout.svelte';
	import DetailsModal from '$lib/components/DetailsModal.svelte';

	export let data;

	// State
	let loading = false;
	let error = null;
	let rentals = [];
	let staffList = [];

	// Filters
	let filters = {
		startDate: '',
		endDate: '',
		serviceType: '',
		staffName: '',
		sortBy: 'submittedAt',
		sortOrder: 'desc'
	};

	// Pagination
	let pagination = {
		limit: 25,
		offset: 0,
		hasMore: false,
		totalPages: 1,
		currentPage: 1
	};

	let filteredCount = 0;

	// Modal state
	let showDetailsModal = false;
	let selectedRental = null;

	// Quick date presets
	const datePresets = [
		{ label: '過去一週間', days: 7 },
		{ label: '過去30日間', days: 30 },
		{ label: '過去90日間', days: 90 },
		{ label: '今年度', fiscalYear: true }
	];

	// Set default date range to last 30 days
	onMount(() => {
		if (browser) {
			setDatePreset(30); // Last 30 days by default
			loadStaffList();
			loadHistoricalData();
		}
	});

	async function loadStaffList() {
		try {
			const response = await fetch('/api/staff');
			if (response.ok) {
				const data = await response.json();
				staffList = (data.staff || [])
					.map((member, index) => ({
						...member,
						order: member.order ?? index
					}))
					.sort((a, b) => a.order - b.order);
			}
		} catch (err) {
			console.error('Error loading staff list:', err);
		}
	}

	function setDatePreset(days, isFiscalYear = false) {
		const today = new Date();

		if (isFiscalYear) {
			// Japanese fiscal year: April 1 to March 31 (full year)
			const currentYear = today.getFullYear();
			const currentMonth = today.getMonth(); // 0-indexed (0 = January, 3 = April)

			// Determine the fiscal year
			const fiscalYear = currentMonth >= 3 ? currentYear : currentYear - 1; // April (month 3) onwards is current FY

			// Set fiscal year start (April 1) and end (March 31)
			const fiscalYearStart = new Date(fiscalYear, 3, 2); // April 1
			const fiscalYearEnd = new Date(fiscalYear + 1, 2, 32); // March 31 of next year

			filters.startDate = fiscalYearStart.toISOString().split('T')[0];
			filters.endDate = fiscalYearEnd.toISOString().split('T')[0];
		} else {
			const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
			filters.endDate = today.toISOString().split('T')[0];
			filters.startDate = days === 0 ? today.toISOString().split('T')[0] : startDate.toISOString().split('T')[0];
		}

		if (browser) {
			handleFilterChange();
		}
	}

	async function loadHistoricalData() {
		loading = true;
		error = null;

		try {
			const params = new URLSearchParams();

			// Add filters to params
			Object.entries(filters).forEach(([key, value]) => {
				if (value && value.toString().trim()) {
					params.append(key, value);
				}
			});

			// Add pagination
			params.append('limit', pagination.limit.toString());
			params.append('offset', pagination.offset.toString());

			const response = await fetch(`/api/rentals/history?${params.toString()}`);

			if (!response.ok) {
				throw new Error('Failed to fetch historical data');
			}

			const data = await response.json();

			rentals = data.rentals || [];
			filteredCount = data.filtered || 0;
			pagination = { ...pagination, ...data.pagination };

		} catch (err) {
			console.error('Error loading historical data:', err);
			error = err.message;
			rentals = [];
		} finally {
			loading = false;
		}
	}

	function handleFilterChange() {
		// Reset pagination when filters change
		pagination.offset = 0;
		pagination.currentPage = 1;
		loadHistoricalData();
	}

	function handleSearch() {
		handleFilterChange();
	}

	function handlePageChange(newPage) {
		pagination.currentPage = newPage;
		pagination.offset = (newPage - 1) * pagination.limit;
		loadHistoricalData();
	}

	function clearFilters() {
		filters = {
			startDate: '',
			endDate: '',
			serviceType: '',
			staffName: '',
			sortBy: 'submittedAt',
			sortOrder: 'desc'
		};
		setDatePreset(30); // Reset to last 30 days
	}

	function exportHistoricalData() {
		// Create CSV export of current filtered results
		const csvHeaders = [
			'Rental ID',
			'Status',
			'Service Type',
			'Customer Name',
			'Customer Contact',
			'Submitted At',
			'Checked In At',
			'Returned At',
			'Total Price',
			'Expected Return',
			'Staff Name',
			'Notes'
		];

		const csvRows = rentals.map(rental => [
			rental.rentalID || '',
			rental.status || '',
			rental.serviceType || '',
			rental.customerName || '',
			rental.customerContact || '',
			rental.submittedAt || '',
			rental.checkedInAt || '',
			rental.returnedAt || '',
			rental.totalPrice || '',
			rental.expectedReturn || '',
			rental.checkInStaff || rental.returnStaff || '',
			[rental.returnNotes, rental.troubleNotes, rental.checkinNotes].filter(Boolean).join('; ')
		]);

		const csvContent = [csvHeaders, ...csvRows]
			.map(row => row.map(field => `"${field}"`).join(','))
			.join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', `historical-orders-${new Date().toISOString().split('T')[0]}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function handleViewDetails(rental) {
		selectedRental = rental;
		showDetailsModal = true;
	}

	function closeDetailsModal() {
		showDetailsModal = false;
		selectedRental = null;
	}

	function formatDate(dateString) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleString('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatPrice(price) {
		return price ? `¥${Number(price).toLocaleString()}` : '-';
	}


	function getServiceIcon(serviceType) {
		switch (serviceType) {
			case 'Bike': return '🚲';
			case 'Onsen': return '♨️';
			case 'Luggage': return '🧳';
			default: return '📋';
		}
	}

	function getDisplayPages() {
		const maxVisible = 5;
		let start = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
		let end = Math.min(pagination.totalPages, start + maxVisible - 1);

		if (end - start < maxVisible - 1) {
			start = Math.max(1, end - maxVisible + 1);
		}

		return Array.from({ length: end - start + 1 }, (_, i) => start + i);
	}
</script>

<svelte:head>
	<title>サービス履歴　Historical Orders</title>
</svelte:head>

<AdminLayout title="サービス履歴　Historical Orders" session={data.session}>
	<!-- Filters Section -->
	<div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Left Side: Date Range and Quick Presets -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-3">日付範囲　Date Range</label>
				<div class="flex flex-wrap items-center gap-4 mb-4">
					<div class="flex space-x-2">
						<input
							type="date"
							bind:value={filters.startDate}
							class="form-input"
							placeholder="Start date"
						/>
						<span class="flex items-center text-gray-500 px-2">to</span>
						<input
							type="date"
							bind:value={filters.endDate}
							class="form-input"
							placeholder="End date"
						/>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-2 max-w-sm">
					{#each datePresets as preset (preset.label)}
						<button
							on:click={() => setDatePreset(preset.days || 0, preset.fiscalYear || false)}
							class="px-1 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							{preset.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Right Side: Service Type, Staff Name, and Action Buttons -->
			<div class="space-y-4 max-w-sm">
				<!-- Service Type -->
				<div class="my-1">
					<label class="block text-sm font-medium text-gray-700 mb-2">サービス種別　Service Type</label>
					<select bind:value={filters.serviceType} class="form-input w-64">
						<option value="">すべて</option>
						<option value="Bike">🚲 レンタサイクル</option>
						<option value="Onsen">♨️ 外湯めぐり</option>
						<option value="Luggage">🧳 荷物預かり</option>
					</select>
				</div>

				<!-- Staff Name -->
				<div class="my-1">
					<label class="block text-sm font-medium text-gray-700 mb-2">担当　Staff</label>
					<select bind:value={filters.staffName} class="form-input w-64">
						<option value="">すべて</option>
						{#each staffList as staff (staff.name)}
							<option value={staff.name}>{staff.name}</option>
						{/each}
					</select>
				</div>

				<!-- Search & Clear Buttons -->
				<div class="flex space-x-3 w-64 mt-3">
					<button on:click={handleSearch} class="btn-primary flex-1 flex items-center justify-center space-x-2" disabled={loading}>
						{#if loading}
							<svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span>Searching...</span>
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
							</svg>
							<span>検索</span>
						{/if}
					</button>
					<button on:click={clearFilters} class="btn-secondary flex-1">
						クリア
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="loading-spinner"></div>
			<span class="ml-3 text-gray-600">Loading historical data...</span>
		</div>
	{:else if error}
		<!-- Error State -->
		<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
			<div class="flex items-center">
				<svg class="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
					<path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
				</svg>
				<div>
					<h3 class="text-red-800 font-medium">Error Loading Data</h3>
					<p class="text-red-700 text-sm">{error}</p>
				</div>
			</div>
		</div>
	{:else if rentals.length === 0}
		<!-- Empty State -->
		<div class="text-center py-12">
			<svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
				<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
			<h3 class="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
			<p class="text-gray-500 mb-4">Try adjusting your search criteria or date range</p>
			<button on:click={clearFilters} class="btn-secondary">Reset Filters</button>
		</div>
	{:else}
		<!-- Results Header with Sort Controls -->
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center space-x-4">
				<h3 class="text-lg font-medium text-gray-900">
					Results ({filteredCount.toLocaleString()})
				</h3>
			</div>
			<div class="flex items-center space-x-3">
				<button
					on:click={exportHistoricalData}
					class="btn-secondary flex items-center space-x-2 hover:bg-green-800 hover:text-slate-50 text-sm"
					disabled={loading || rentals.length === 0}
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							style="fill-rule: evenodd; clip-rule: evenodd;"
							d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
						/>
					</svg>
					<span>データ出力</span>
				</button>
				<div class="flex items-center space-x-2">
					<label class="text-sm font-medium text-gray-700 whitespace-nowrap">並び替え</label>
					<select bind:value={filters.sortBy} on:change={handleFilterChange} class="form-input text-sm">
						<option value="submittedAt">Submitted Time</option>
						<option value="totalPrice">Price</option>
					</select>
				</div>
				<div class="flex items-center space-x-1">
					<button
						on:click={() => { filters.sortOrder = 'asc'; handleFilterChange(); }}
						class="p-1 rounded hover:bg-gray-100 {filters.sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}"
						title="Sort ascending"
					>
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
						</svg>
					</button>
					<button
						on:click={() => { filters.sortOrder = 'desc'; handleFilterChange(); }}
						class="p-1 rounded hover:bg-gray-100 {filters.sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}"
						title="Sort descending"
					>
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
						</svg>
					</button>
				</div>
			</div>
		</div>

		<!-- Results Table -->
		<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Info</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timeline</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each rentals as rental (rental.rentalID)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">{rental.rentalID}</div>
									<div class="text-sm text-gray-500">{formatDate(rental.submittedAt)}</div>
								</td>
								<td class="px-6 py-4">
									<div class="text-sm font-medium text-gray-900">{rental.customerName || 'N/A'}</div>
									<div class="text-sm text-gray-500">{rental.customerContact || 'N/A'}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<span class="text-lg mr-2">{getServiceIcon(rental.serviceType)}</span>
										<div>
											<div class="text-sm font-medium text-gray-900">{rental.serviceType}</div>
											{#if rental.serviceType === 'Bike' && rental.bikeCount}
												<div class="text-xs text-gray-500">{rental.bikeCount} bikes</div>
											{:else if rental.serviceType === 'Luggage' && rental.luggageCount}
												<div class="text-xs text-gray-500">{rental.luggageCount} items</div>
											{:else if rental.serviceType === 'Onsen' && (rental.totalAdultCount || rental.totalChildCount)}
												<div class="text-xs text-gray-500">
													{(Number(rental.totalAdultCount) || 0) + (Number(rental.totalChildCount) || 0) + (Number(rental.kidsCount) || 0)} people
												</div>
											{/if}
										</div>
									</div>
								</td>
								<td class="px-6 py-4 text-sm text-gray-500">
									<div>Checked: {formatDate(rental.checkedInAt) || '-'}</div>
									<div>Returned: {formatDate(rental.returnedAt) || '-'}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
									{formatPrice(rental.totalPrice)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
									<button
										on:click={() => handleViewDetails(rental)}
										class="text-blue-600 hover:text-blue-900 hover:underline"
									>
										View Details
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if pagination.totalPages > 1}
				<div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
					<div class="flex-1 flex justify-between sm:hidden">
						<button
							on:click={() => handlePageChange(pagination.currentPage - 1)}
							disabled={pagination.currentPage === 1}
							class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Previous
						</button>
						<button
							on:click={() => handlePageChange(pagination.currentPage + 1)}
							disabled={!pagination.hasMore}
							class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Next
						</button>
					</div>
					<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
						<div>
							<p class="text-sm text-gray-700">
								Showing <span class="font-medium">{pagination.offset + 1}</span> to
								<span class="font-medium">{Math.min(pagination.offset + pagination.limit, filteredCount)}</span> of
								<span class="font-medium">{filteredCount.toLocaleString()}</span> results
							</p>
						</div>
						<div>
							<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
								<button
									on:click={() => handlePageChange(pagination.currentPage - 1)}
									disabled={pagination.currentPage === 1}
									class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Previous
								</button>
								{#each getDisplayPages() as pageNum (pageNum)}
									<button
										on:click={() => handlePageChange(pageNum)}
										class="relative inline-flex items-center px-4 py-2 border text-sm font-medium {pageNum === pagination.currentPage ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}"
									>
										{pageNum}
									</button>
								{/each}
								<button
									on:click={() => handlePageChange(pagination.currentPage + 1)}
									disabled={!pagination.hasMore}
									class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Next
								</button>
							</nav>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</AdminLayout>

<!-- Details Modal -->
{#if showDetailsModal}
	<DetailsModal show={showDetailsModal} rental={selectedRental} onClose={closeDetailsModal} />
{/if}

<style>
	.loading-spinner {
		border: 3px solid #f3f3f3;
		border-top: 3px solid #3498db;
		border-radius: 50%;
		width: 20px;
		height: 20px;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>