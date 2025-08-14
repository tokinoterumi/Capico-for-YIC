<script lang="ts">
	export let onFilterChange: ((filters: FilterData) => void) | null = null;

	interface FilterData {
		status: string;
		serviceType: string;
	}

	let selectedServiceType = 'all';

	// Available filter options
	const serviceTypeOptions = [
		{ value: 'all', label: 'すべて', icon: '📋' },
		{ value: 'Bike', label: 'レンタサイクル', icon: '🚲' },
		{ value: 'Onsen', label: '外湯めぐり', icon: '♨️' },
		{ value: 'Luggage', label: '手荷物保管', icon: '🧳' }
	];

	// Reactive statement to emit filter changes
	$: {
		if (onFilterChange) {
			onFilterChange({
				status: 'all', // Always 'all' since status filtering is handled by stats cards
				serviceType: selectedServiceType
			});
		}
	}


	function clearFilters() {
		selectedServiceType = 'all';
	}

	// Check if any filters are active
	$: hasActiveFilters = selectedServiceType !== 'all';
</script>

<div class="flex flex-wrap items-center gap-4">
	<!-- Service Type Filter -->
	<div class="flex items-center space-x-2">
		<label
			for="serviceTypeFilter"
			class="text-sm text-center font-medium text-gray-700 whitespace-nowrap"
		>
			サービス<br />Service
		</label>
		<select
			id="serviceTypeFilter"
			bind:value={selectedServiceType}
			class="form-select text-sm min-w-0"
		>
			{#each serviceTypeOptions as option}
				<option value={option.value}>
					{option.icon}
					{option.label}
				</option>
			{/each}
		</select>
	</div>

	<!-- Clear Filters Button -->
	{#if hasActiveFilters}
		<button on:click={clearFilters} class="text-sm text-gray-500 hover:text-gray-700 underline">
			クリア / Clear
		</button>
	{/if}

	<!-- Active Filter Indicators -->
	{#if hasActiveFilters}
		<div class="flex items-center space-x-2">
			<span class="text-xs text-gray-500">フィルタ適用中:</span>

			{#if selectedServiceType !== 'all'}
				<span
					class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
				>
					{serviceTypeOptions.find((s) => s.value === selectedServiceType)?.icon}
					{serviceTypeOptions.find((s) => s.value === selectedServiceType)?.label}
				</span>
			{/if}
		</div>
	{/if}
</div>

<!-- Quick Filter Buttons (Mobile-friendly) -->
<div class="mt-3 flex flex-wrap gap-2 sm:hidden">
	<button
		on:click={() => (selectedServiceType = 'Bike')}
		class="btn-touch px-3 py-1 text-xs rounded-full border transition-colors {selectedServiceType ===
		'Bike'
			? 'bg-green-100 text-green-800 border-green-200'
			: 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}"
	>
		🚲 自転車
	</button>

	<button
		on:click={() => (selectedServiceType = 'Onsen')}
		class="btn-touch px-3 py-1 text-xs rounded-full border transition-colors {selectedServiceType ===
		'Onsen'
			? 'bg-blue-100 text-blue-800 border-blue-200'
			: 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}"
	>
		♨️ 温泉
	</button>

	<button
		on:click={() => (selectedServiceType = 'Luggage')}
		class="btn-touch px-3 py-1 text-xs rounded-full border transition-colors {selectedServiceType ===
		'Luggage'
			? 'bg-purple-100 text-purple-800 border-purple-200'
			: 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}"
	>
		🧳 お荷物
	</button>
</div>
