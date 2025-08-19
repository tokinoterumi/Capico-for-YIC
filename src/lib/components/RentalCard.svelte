<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	export let rental;
	export let showActions = true;
	export let compact = false;

	// Create an event dispatcher instance. This is the standard Svelte way.
	const dispatch = createEventDispatcher();

	// Helper function to get Japanese service type display name
	function getServiceTypeDisplayName(serviceType: string): string {
		switch (serviceType) {
			case 'Bike':
				return 'レンタサイクル';
			case 'Onsen':
				return '外湯めぐり';
			case 'Luggage':
				return '荷物お預かり';
			default:
				return serviceType;
		}
	}

	// Helper function to get readable rental plan text for Bike service
	function getBikeRentalPlanDisplayName(rentalPlan: string): string {
		const planMap: { [key: string]: string } = {
			'2hours': '2 Hours',
			'3hours': '3 Hours',
			'4hours': '4 Hours',
			fullday: 'Full Day'
		};
		return planMap[rentalPlan] || rentalPlan;
	}

	function getTimeStatus(expectedReturn, serviceType) {
		if (serviceType !== 'Bike') return null;

		if (!expectedReturn) return null;
		const now = new Date();
		const expected = new Date(expectedReturn);
		const diffMinutes = Math.ceil((expected - now) / (1000 * 60));

		if (diffMinutes < 0) {
			return {
				status: 'overdue',
				text: `${Math.abs(diffMinutes)}分遅延`,
				color: 'text-red-600 bg-red-50'
			};
		} else if (diffMinutes < 30) {
			return {
				status: 'due-soon',
				text: `${diffMinutes}分後`,
				color: 'text-orange-600 bg-orange-50'
			};
		} else {
			return { status: 'on-time', text: `${diffMinutes}分後`, color: 'text-green-600 bg-green-50' };
		}
	}

	function formatExpectedReturn(expectedReturn) {
		if (!expectedReturn) return '';
		const date = new Date(expectedReturn);
		const today = new Date();
		const isToday = date.toDateString() === today.toDateString();
		
		if (isToday) {
			return date.toLocaleTimeString('ja-JP', { 
				hour: '2-digit', 
				minute: '2-digit',
				hour12: false 
			});
		} else {
			return date.toLocaleDateString('ja-JP', { 
				month: 'numeric', 
				day: 'numeric' 
			}) + ' ' + date.toLocaleTimeString('ja-JP', { 
				hour: '2-digit', 
				minute: '2-digit',
				hour12: false 
			});
		}
	}

	function getServiceIcon(serviceType) {
		switch (serviceType) {
			case 'Bike':
				return '🚲';
			case 'Onsen':
				return '♨️';
			case 'Luggage':
				return '🧳';
			default:
				return '📋';
		}
	}

	function getServiceTheme(serviceType) {
		switch (serviceType) {
			case 'Bike':
				return 'border-green-200 bg-green-50';
			case 'Onsen':
				return 'border-blue-200 bg-blue-50';
			case 'Luggage':
				return 'border-purple-200 bg-purple-50';
			default:
				return 'border-gray-200 bg-gray-50';
		}
	}

	// --- Event dispatching functions ---
	// These now use the 'dispatch' function we created above.
	function handleCheckin() {
		dispatch('checkin', rental);
	}
	function handleMoveToActive() {
		dispatch('moveToActive', rental);
	}
	function handleReturn() {
		dispatch('return', rental);
	}
	function handleCancel() {
		dispatch('cancel', rental);
	}
	function handleTrouble() {
		dispatch('trouble', rental);
	}
	function handleViewDetails() {
		dispatch('viewDetails', rental);
	}
	function handleResolve() {
		dispatch('resolve', rental);
	}
	function handleEdit() {
		dispatch('edit', rental);
	}

	$: timeStatus = getTimeStatus(rental.expectedReturn, rental.serviceType);
	$: serviceTheme = getServiceTheme(rental.serviceType);
</script>

<!-- HTML structure remains the same -->
<div
	class="card {serviceTheme} {compact ? 'p-4' : 'p-6'} transition-all duration-200 hover:shadow-md"
>
	<!-- Header -->
	<div class="flex items-start justify-between mb-4">
		<div class="flex items-center space-x-3">
			<div class="text-2xl">{getServiceIcon(rental.serviceType)}</div>
			<div>
				<div class="flex items-center space-x-2">
					<h3 class="font-semibold text-gray-900">{rental.rentalID}</h3>
					<span
						class="status-badge status-{rental.status
							.toLowerCase()
							.replace('_', '-')
							.replace(/\s+/g, '-')
							.replace(/[()]/g, '')}"
					>
						{rental.status === 'Awaiting_Storage' ? 'Awaiting Storage' : rental.status}
					</span>
				</div>
				<p class="text-sm text-gray-600 mt-1">
					{getServiceTypeDisplayName(rental.serviceType)}
				</p>
			</div>
		</div>
		{#if timeStatus && rental.status === 'Active'}
			<div class="px-2 py-1 rounded-md text-xs font-medium {timeStatus.color}">
				{timeStatus.text}
			</div>
		{/if}
	</div>

	<!-- Customer Information -->
	<div class="space-y-2 mb-4">
		<div class="flex items-center space-x-2">
			<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
					clip-rule="evenodd"
				/>
			</svg>
			<span class="text-sm text-gray-700">{rental.customerName}</span>
		</div>
		{#if rental.customerContact}
			<div class="flex items-center space-x-2">
				<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
					<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
					<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
				</svg>
				<span class="text-sm text-gray-600">{rental.customerContact}</span>
			</div>
		{/if}
	</div>

	<!-- Service-Specific Details -->
	{#if !compact}
		<div class="bg-white rounded-lg p-3 mb-4">
			{#if rental.serviceType === 'Bike'}
				<div class="grid grid-cols-2 gap-3 text-sm">
					<div>
						<span class="text-gray-500">プラン </span>
						<span class="font-medium">{getBikeRentalPlanDisplayName(rental.rentalPlan)}</span>
					</div>
					{#if rental.bikeNumber}
						<div>
							<span class="text-gray-500">台数 </span>
							<span class="font-medium">{rental.bikeNumber}</span>
						</div>
					{/if}
				</div>
			{:else if rental.serviceType === 'Onsen'}
				<div class="grid grid-cols-2 gap-3 text-sm">
					<div>
						<span class="text-gray-500">大人 </span>
						<span class="font-medium">{Number(rental.totalAdultCount) || 0}名</span>
					</div>
					<div>
						<span class="text-gray-500">小人 </span>
						<span class="font-medium">{Number(rental.totalChildCount) || 0}名</span>
					</div>
					{#if rental.onsenKeyNumber}
						<div class="col-span-2">
							<span class="text-gray-500">鍵番号 </span>
							<span class="font-medium">{rental.onsenKeyNumber}</span>
						</div>
					{/if}
				</div>
			{:else if rental.serviceType === 'Luggage'}
				<div class="grid grid-cols-2 gap-3 text-sm">
					<div>
						<span class="text-gray-500">数量</span>
						<span class="font-medium">{rental.luggageCount}</span>
					</div>
					{#if rental.luggageTagNumber}
						<div>
							<span class="text-gray-500">タグ </span>
							<span class="font-medium">{rental.luggageTagNumber}</span>
						</div>
					{/if}
					{#if rental.expectedReturn}
						<div class="col-span-2">
							<span class="text-gray-500">予定返却 </span>
							<span class="font-medium">{formatExpectedReturn(rental.expectedReturn)}</span>
						</div>
					{/if}
				</div>
			{/if}
			<div class="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
				<span class="text-gray-500 text-sm">料金 </span>
				<span class="font-semibold text-gray-900"
					>¥{rental.totalPrice?.toLocaleString() || '0'}</span
				>
			</div>
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex flex-wrap gap-2">
		{#if showActions}
			{#if rental.status === 'Pending'}
				<button on:click={handleCheckin} class="btn-primary text-sm px-3 py-2">チェックイン</button>
				<button on:click={handleEdit} class="btn-secondary text-sm px-3 py-2">編集</button>
				<button on:click={handleCancel} class="btn-secondary text-sm px-3 py-2">キャンセル</button>
			{:else if rental.status === 'Awaiting_Storage'}
				<button on:click={handleMoveToActive} class="btn-success text-sm px-3 py-2">保管完了</button>
				<button on:click={handleEdit} class="btn-secondary text-sm px-3 py-2">編集</button>
			{:else if rental.status === 'Active'}
				<button on:click={handleReturn} class="btn-primary text-sm px-3 py-2">
					{rental.serviceType === 'Luggage' ? '引き渡し' : '返却'}
				</button>
				<button on:click={handleTrouble} class="btn-danger text-sm px-3 py-2">トラブル</button>
			{:else if rental.status === 'Troubled'}
				<button on:click={handleResolve} class="btn-success text-sm px-3 py-2">解決済み</button>
			{/if}
		{/if}
		<!-- Always show details button -->
		<button on:click={handleViewDetails} class="btn-secondary text-sm px-3 py-2">詳細</button>
	</div>
</div>
