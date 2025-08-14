<script>
	import { onMount } from 'svelte';

	export let show = false;
	export let rental = null;
	export let onSuccess = null;
	export let onClose = null;

	let returnStaff = '';
	let returnNotes = '';
	let goodCondition = false;
	let processing = false;

	// Staff list state
	let staffList = [];
	let loadingStaff = false;

	onMount(() => {
		loadStaffList();
	});

	async function loadStaffList() {
		loadingStaff = true;
		try {
			const response = await fetch('/api/staff');
			if (response.ok) {
				const data = await response.json();
				staffList = data.staff || [];
			}
		} catch (err) {
			console.error('Error loading staff list:', err);
		} finally {
			loadingStaff = false;
		}
	}

	// Reset form when modal opens
	$: if (show && rental) {
		resetForm();
	}

	function resetForm() {
		returnNotes = '';
		goodCondition = false;
		processing = false;
	}

	// Get service-specific good condition text
	function getGoodConditionText(serviceType) {
		switch (serviceType) {
			case 'Bike':
				return '自転車が良好な状態で返却されました<br />Bikes returned in Good Condition';
			case 'Onsen':
				return '鍵とカゴを回収しました<br />Keys and baskets collected successfully';
			case 'Luggage':
				return 'お荷物をお渡ししました<br />Luggage handed over to customer';
			default:
				return 'サービスが完了しました<br />Service completed successfully';
		}
	}

	// Get Japanese service type display name
	function getServiceTypeDisplayName(serviceType) {
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

	async function handleSubmit() {
		if (!validateForm()) return;

		processing = true;

		try {
			// Call the return API endpoint
			const response = await fetch('/api/return', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					rentalID: rental.rentalID,
					returnStaff,
					returnNotes: returnNotes.trim(),
					goodCondition,
					returnedAt: new Date().toISOString()
				})
			});

			if (response.ok) {
				const result = await response.json();
				alert(`返却処理完了: ${result.message}`);
				onSuccess?.();
				handleClose();
			} else {
				const error = await response.json();
				alert(`エラー: ${error.error || error.message || 'Unknown error'}`);
			}
		} catch (err) {
			console.error('Return processing error:', err);
			alert('返却処理中にエラーが発生しました<br />Error occurred during return processing');
		} finally {
			processing = false;
		}
	}

	function validateForm() {
		// Only validate staff name for non-luggage services
		if (rental?.serviceType !== 'Luggage' && !returnStaff.trim()) {
			alert('担当スタッフ名を入力してください / Please enter staff name');
			return false;
		}

		// Return notes validation removed - now optional
		if (returnNotes.trim() && returnNotes.trim().length < 5) {
			alert('返却メモは5文字以上で入力してください / Return notes must be at least 5 characters');
			return false;
		}

		if (!goodCondition) {
			alert('状態確認にチェックを入れてください / Please check the condition confirmation');
			return false;
		}

		return true;
	}

	function handleClose() {
		onClose?.();
	}

	// Close modal when clicking outside
	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}
</script>

<!-- Modal Backdrop -->
{#if show}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		on:click={handleBackdropClick}
		on:keydown={(e) => e.key === 'Escape' && handleClose()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<!-- Header -->
			<div class="border-b border-gray-200 px-6 py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900 flex items-center">
						<svg class="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							/>
						</svg>
						返却処理<br />Return Processing
					</h2>
					<button
						on:click={handleClose}
						class="text-gray-400 hover:text-gray-500"
						disabled={processing}
						aria-label="Close modal"
					>
						<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="px-6 py-4 space-y-6">
				<!-- Rental Information -->
				{#if rental}
					<div class="bg-green-50 rounded-lg p-4">
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-green-700">ID:</span>
								<span class="font-medium">{rental.rentalID}</span>
							</div>
							<div>
								<span class="text-green-700">サービス:</span>
								<span class="font-medium">{getServiceTypeDisplayName(rental.serviceType)}</span>
							</div>
							<div>
								<span class="text-green-700">お客様名:</span>
								<span class="font-medium">{rental.customerName}</span>
							</div>
							{#if rental.serviceType === 'Bike' && rental.bikeNumber}
								<div>
									<span class="text-green-700">自転車番号:</span>
									<span class="font-medium">{rental.bikeNumber}</span>
								</div>
							{:else if rental.serviceType === 'Onsen' && rental.onsenKeyNumber}
								<div>
									<span class="text-green-700">鍵番号:</span>
									<span class="font-medium">{rental.onsenKeyNumber}</span>
								</div>
							{:else if rental.serviceType === 'Luggage' && rental.luggageTagNumber}
								<div>
									<span class="text-green-700">タグ番号:</span>
									<span class="font-medium">{rental.luggageTagNumber}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Staff Information (hidden for luggage) -->
				{#if rental?.serviceType !== 'Luggage'}
					<div class="form-group">
						<label for="returnStaff" class="form-label">
							返却受付スタッフ<br />Return Staff *
						</label>
						{#if loadingStaff}
							<div class="flex items-center space-x-2 p-3 border rounded-lg">
								<div class="loading-spinner"></div>
								<span class="text-sm text-gray-500">スタッフリスト読み込み中...</span>
							</div>
						{:else if staffList.length > 0}
							<select
								id="returnStaff"
								bind:value={returnStaff}
								class="form-select"
								disabled={processing}
								required
							>
								<option value="">スタッフを選択してください</option>
								{#each staffList as staff}
									<option value={staff.name}>{staff.name}</option>
								{/each}
							</select>
						{:else}
							<div class="p-3 border rounded-lg bg-yellow-50 border-yellow-200">
								<p class="text-sm text-yellow-800">スタッフが登録されていません</p>
								<p class="text-xs text-yellow-600 mt-1">管理者にスタッフの登録を依頼してください</p>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Return Notes -->
				<div class="form-group">
					<label for="returnNotes" class="form-label"> 返却メモ<br />Return Notes </label>
					<textarea
						id="returnNotes"
						bind:value={returnNotes}
						class="form-textarea"
						rows="4"
						disabled={processing}
					></textarea>
					<p class="text-sm text-gray-500 mt-1">
						返却時の状況や特記事項があれば記載してください（任意）
					</p>
				</div>

				<!-- Good Condition Checkbox -->
				<div class="form-group">
					<div class="flex items-start space-x-3">
						<input
							id="goodCondition"
							type="checkbox"
							bind:checked={goodCondition}
							class="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
							disabled={processing}
							required
						/>
						<label for="goodCondition" class="text-sm text-gray-700">
							{#if rental}
								{@html getGoodConditionText(rental.serviceType)}
							{:else}
								状態確認完了<br />Condition confirmed
							{/if}
						</label>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 px-6 py-4">
				<div class="flex justify-end space-x-3">
					<button on:click={handleClose} class="btn-secondary" disabled={processing}>
						キャンセル<br />Cancel
					</button>
					<button
						on:click={handleSubmit}
						class="btn-primary bg-green-600 hover:bg-green-700"
						disabled={processing}
					>
						{#if processing}
							<div class="loading-spinner mr-2"></div>
							処理中...
						{:else}
							返却完了<br />Complete Return
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
