<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import AdminLayout from '$lib/components/AdminLayout.svelte';

	export let data;

	interface StorageItem {
		rentalID: string;
		customerName: string;
		serviceType: string;
		luggageCount?: number;
		luggageTagNumber?: string;
		submittedAt: string;
		hotelName?: string;
		guestName?: string;
		isHotelPartnership?: boolean;
		checkedInAt?: string;
		checkInStaff?: string;
	}

	let awaitingItems: StorageItem[] = [];
	let inProgressItems: StorageItem[] = [];
	let completedItems: StorageItem[] = [];
	let loading = true;
	let error: string | null = null;
	let currentStaff = 'Floor Staff';
	let draggedItem: StorageItem | null = null;

	onMount(() => {
		loadStorageItems();
		const interval = setInterval(() => {
			loadStorageItems(false);
		}, 15000);

		return () => clearInterval(interval);
	});

	async function loadStorageItems(showLoading = true) {
		if (!browser) return;

		if (showLoading) loading = true;
		error = null;

		try {
			const response = await fetch('/api/rentals?status=Awaiting_Storage');

			if (!response.ok) {
				throw new Error('Failed to fetch storage items');
			}

			const data = await response.json();
			const items = data.rentals || [];

			// Categorize items based on their processing state
			awaitingItems = items.filter((item: StorageItem) => !item.checkedInAt);
			inProgressItems = items.filter((item: StorageItem) => item.checkedInAt && !isCompleted(item));
			completedItems = items.filter((item: StorageItem) => isCompleted(item));
		} catch (err) {
			console.error('Error loading storage items:', err);
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	function isCompleted(item: StorageItem): boolean {
		// In a real implementation, you might check for a completion timestamp
		// For now, we'll use a simple heuristic
		return false; // Items move to "Active" status when completed, so they won't appear here
	}

	async function handleMoveToActive(item: StorageItem) {
		try {
			const response = await fetch('/api/move-to-active', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					rentalID: item.rentalID,
					staffName: currentStaff,
					storageLocation: getSelectedStorageLocation(item),
					notes: `Completed by floor staff: ${currentStaff}`
				})
			});

			if (response.ok) {
				await loadStorageItems(false);
				showSuccessToast(`${item.rentalID} 保管完了`);
			} else {
				const errorData = await response.json();
				alert(`エラー: ${errorData.message}`);
			}
		} catch (err) {
			console.error('Move to active error:', err);
			alert('保管完了処理中にエラーが発生しました');
		}
	}

	function getSelectedStorageLocation(item: StorageItem): string {
		// In a real implementation, this might come from a dropdown or be assigned automatically
		return 'Area A - Front';
	}

	function showSuccessToast(message: string) {
		// Simple toast notification - in a real app, you'd use a proper toast library
		const toast = document.createElement('div');
		toast.className =
			'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
		toast.textContent = message;
		document.body.appendChild(toast);

		setTimeout(() => {
			toast.remove();
		}, 3000);
	}

	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleTimeString('ja-JP', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

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
			return 'border-red-500 bg-red-50';
		} else if (diffMinutes > 15) {
			return 'border-orange-500 bg-orange-50';
		} else {
			return 'border-blue-500 bg-blue-50';
		}
	}

	function getItemIcon(serviceType: string): string {
		switch (serviceType) {
			case 'Luggage':
				return '🧳';
			default:
				return '📦';
		}
	}

	// Drag and drop handlers
	function handleDragStart(event: DragEvent, item: StorageItem) {
		draggedItem = item;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function handleDrop(event: DragEvent, targetColumn: string) {
		event.preventDefault();
		if (!draggedItem) return;

		if (targetColumn === 'in-progress') {
			// Move item to in-progress
			awaitingItems = awaitingItems.filter((item) => item.rentalID !== draggedItem!.rentalID);
			inProgressItems = [...inProgressItems, draggedItem];
		} else if (targetColumn === 'completed') {
			// Complete the item
			handleMoveToActive(draggedItem);
		}

		draggedItem = null;
	}
</script>

<svelte:head>
	<title>フロアスタッフビュー</title>
</svelte:head>

<AdminLayout
	title="フロアスタッフビュー　Floor Staff View"
	showAwaitingWidget={false}
	session={data.session}
>
	<!-- Header Controls -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">保管作業ボード　Storage Work Board</h1>
		</div>

		<div class="flex items-center space-x-4">
			<!-- Refresh Button -->
			<button on:click={() => loadStorageItems()} class="btn-secondary" disabled={loading}>
				{#if loading}
					<div class="loading-spinner mr-2"></div>
				{/if}
				更新<br />Refresh
			</button>
		</div>
	</div>

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
					<h3 class="text-red-800 font-medium">データ取得エラー</h3>
					<p class="text-red-700 text-sm">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Kanban Board -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
		<!-- Awaiting Storage Column -->
		<div
			class="bg-blue-50 rounded-lg border-2 border-blue-200 p-4 flex flex-col"
			role="region"
			aria-label="Awaiting Storage column - drop zone for storage items"
			on:dragover={handleDragOver}
			on:drop={(e) => handleDrop(e, 'awaiting')}
		>
			<div class="flex items-center justify-between mb-4">
				<h2 class="font-semibold text-blue-900 flex items-center">
					<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z"
							clip-rule="evenodd"
						/>
					</svg>
					保管待ち　Awaiting Storage
				</h2>
				<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
					{awaitingItems.length}
				</span>
			</div>

			<div class="flex-1 overflow-y-auto space-y-3">
				{#each awaitingItems as item (item.rentalID)}
					<div
						class="bg-white border-l-4 {getUrgencyClass(
							item.submittedAt
						)} rounded-lg p-4 cursor-move shadow-sm hover:shadow-md transition-all duration-200"
						draggable="true"
						on:dragstart={(e) => handleDragStart(e, item)}
						role="listitem"
					>
						<!-- Item Header -->
						<div class="flex items-start justify-between mb-2">
							<div class="flex items-center space-x-2">
								<span class="text-xl">{getItemIcon(item.serviceType)}</span>
								<div>
									<p class="font-medium text-sm text-gray-900">{item.rentalID}</p>
									<p class="text-xs text-red-600 font-medium">
										{getWaitingTime(item.submittedAt)}前
									</p>
								</div>
							</div>
							<button
								on:click={() => handleMoveToActive(item)}
								class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
							>
								完了
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
					</div>
				{/each}

				{#if awaitingItems.length === 0}
					<div class="text-center py-8 text-gray-500">
						<svg
							class="w-12 h-12 mx-auto mb-3 text-gray-300"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1-2H8l-1 2H5V5z"
								clip-rule="evenodd"
							/>
						</svg>
						<p class="text-sm">保管待ちなし</p>
						<p class="text-xs">No items awaiting storage</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- In Progress Column -->
		<div
			class="bg-orange-50 rounded-lg border-2 border-orange-200 p-4 flex flex-col"
			role="region"
			aria-label="In Progress column - drop zone for items being processed"
			on:dragover={handleDragOver}
			on:drop={(e) => handleDrop(e, 'in-progress')}
		>
			<div class="flex items-center justify-between mb-4">
				<h2 class="font-semibold text-orange-900 flex items-center">
					<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
							clip-rule="evenodd"
						/>
					</svg>
					作業中　In Progress
				</h2>
				<span class="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm font-medium">
					{inProgressItems.length}
				</span>
			</div>

			<div class="flex-1 overflow-y-auto space-y-3">
				{#each inProgressItems as item (item.rentalID)}
					<div
						class="bg-white border-l-4 border-orange-500 rounded-lg p-4 cursor-move shadow-sm hover:shadow-md transition-all duration-200"
						draggable="true"
						on:dragstart={(e) => handleDragStart(e, item)}
						role="listitem"
					>
						<!-- Similar content to awaiting items -->
						<div class="flex items-start justify-between mb-2">
							<div class="flex items-center space-x-2">
								<span class="text-xl">{getItemIcon(item.serviceType)}</span>
								<div>
									<p class="font-medium text-sm text-gray-900">{item.rentalID}</p>
									<p class="text-xs text-orange-600">作業中</p>
								</div>
							</div>
							<button
								on:click={() => handleMoveToActive(item)}
								class="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
							>
								完了
							</button>
						</div>

						<div class="space-y-1">
							<p class="text-xs text-gray-600">{item.customerName}</p>
							{#if item.luggageTagNumber}
								<p class="text-xs text-gray-600 font-mono">{item.luggageTagNumber}</p>
							{/if}
						</div>
					</div>
				{/each}

				{#if inProgressItems.length === 0}
					<div class="text-center py-8 text-gray-400">
						<p class="text-sm">作業中の項目なし</p>
						<p class="text-xs">No items in progress</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Completed Column -->
		<div
			class="bg-green-50 rounded-lg border-2 border-green-200 p-4 flex flex-col"
			role="region"
			aria-label="Completed column - drop zone for completed items"
			on:dragover={handleDragOver}
			on:drop={(e) => handleDrop(e, 'completed')}
		>
			<div class="flex items-center justify-between mb-4">
				<h2 class="font-semibold text-green-900 flex items-center">
					<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
					完了　Completed
				</h2>
				<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
					{completedItems.length}
				</span>
			</div>

			<div class="flex-1 overflow-y-auto space-y-3">
				{#each completedItems as item (item.rentalID)}
					<div class="bg-white border-l-4 border-green-500 rounded-lg p-4 shadow-sm">
						<div class="flex items-start justify-between mb-2">
							<div class="flex items-center space-x-2">
								<span class="text-xl">{getItemIcon(item.serviceType)}</span>
								<div>
									<p class="font-medium text-sm text-gray-900">{item.rentalID}</p>
									<p class="text-xs text-green-600">保管完了</p>
								</div>
							</div>
							<svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>

						<div class="space-y-1">
							<p class="text-xs text-gray-600">{item.customerName}</p>
							{#if item.luggageTagNumber}
								<p class="text-xs text-gray-600 font-mono">{item.luggageTagNumber}</p>
							{/if}
						</div>
					</div>
				{/each}

				{#if completedItems.length === 0}
					<div class="text-center py-8 text-gray-400">
						<p class="text-sm">完了項目なし</p>
						<p class="text-xs">No completed items</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Footer Stats -->
	<div class="mt-6 grid grid-cols-3 gap-4">
		<div class="bg-blue-100 rounded-lg p-4 text-center">
			<div class="text-2xl font-bold text-blue-600">{awaitingItems.length}</div>
			<div class="text-sm text-blue-700">保管待ち</div>
		</div>
		<div class="bg-orange-100 rounded-lg p-4 text-center">
			<div class="text-2xl font-bold text-orange-600">{inProgressItems.length}</div>
			<div class="text-sm text-orange-700">作業中</div>
		</div>
		<div class="bg-green-100 rounded-lg p-4 text-center">
			<div class="text-2xl font-bold text-green-600">{completedItems.length}</div>
			<div class="text-sm text-green-700">完了</div>
		</div>
	</div>
</AdminLayout>
