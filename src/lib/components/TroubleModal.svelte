<script>
	import { onMount } from 'svelte';

	export let show = false;
	export let rental = null;
	export let onSuccess = null;
	export let onClose = null;

	let staffName = '';
	let issueType = '';
	let description = '';
	let processing = false;

	// Staff list state
	let staffList = [];
	let loadingStaff = false;

	// Common trouble types
	const issueTypes = [
		{ value: 'damage', label: '破損' },
		{ value: 'lost', label: '紛失' },
		{ value: 'theft', label: '盗難' },
		{ value: 'accident', label: '事故' },
		{ value: 'malfunction', label: '故障' },
		{ value: 'customer_complaint', label: 'クレーム' },
		{ value: 'other', label: 'その他' }
	];

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
		issueType = '';
		description = '';
		processing = false;
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
			// Update rental status to Troubled and add trouble notes
			const response = await fetch('/api/rentals', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					rentalID: rental.rentalID,
					status: 'Troubled',
					troubleNotes: `[${issueType.toUpperCase()}] ${description}`,
					troubleResolved: false,
					lastUpdated: new Date().toISOString()
				})
			});

			if (response.ok) {
				alert(`トラブル記録完了`);
				onSuccess?.();
				handleClose();
			} else {
				const error = await response.json();
				alert(`エラー / Error: ${error.message}`);
			}
		} catch (err) {
			console.error('Trouble report error:', err);
			alert('トラブル記録にエラーが発生しました');
		} finally {
			processing = false;
		}
	}

	function validateForm() {
		if (!staffName.trim()) {
			alert('担当名を入力してください');
			return false;
		}

		if (!issueType) {
			alert('トラブルの種類');
			return false;
		}

		if (!description.trim()) {
			alert('詳細');
			return false;
		}

		if (description.trim().length < 10) {
			alert('10文字以上で入力してください');
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
						<svg class="w-6 h-6 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
						トラブル報告<br />Trouble Report
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
					<div class="bg-orange-50 rounded-lg p-4">
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-orange-700">ID:</span>
								<span class="font-medium">{rental.rentalID}</span>
							</div>
							<div>
								<span class="text-orange-700">サービス:</span>
								<span class="font-medium">{getServiceTypeDisplayName(rental.serviceType)}</span>
							</div>
							<div>
								<span class="text-orange-700">お客様名:</span>
								<span class="font-medium">{rental.customerName}</span>
							</div>
							{#if rental.serviceType === 'Bike' && rental.bikeNumber}
								<div>
									<span class="text-orange-700">自転車:</span>
									<span class="font-medium">{rental.bikeNumber}</span>
								</div>
							{:else if rental.serviceType === 'Onsen' && rental.onsenKeyNumber}
								<div>
									<span class="text-orange-700">鍵番号:</span>
									<span class="font-medium">{rental.onsenKeyNumber}</span>
								</div>
							{:else if rental.serviceType === 'Luggage' && rental.luggageTagNumber}
								<div>
									<span class="text-orange-700">タグ番号:</span>
									<span class="font-medium">{rental.luggageTagNumber}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Staff Information -->
				<div class="form-group">
					<label for="staffName" class="form-label"> 報告者　Staff Name * </label>
					{#if loadingStaff}
						<div class="flex items-center space-x-2 p-3 border rounded-lg">
							<div class="loading-spinner"></div>
							<span class="text-sm text-gray-500">スタッフリスト読み込み中...</span>
						</div>
					{:else if staffList.length > 0}
						<select
							id="staffName"
							bind:value={staffName}
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

				<!-- Issue Type -->
				<div class="form-group">
					<label for="issueType" class="form-label"> トラブルの種類　Issue Type * </label>
					<select
						id="issueType"
						bind:value={issueType}
						class="form-select"
						disabled={processing}
						required
					>
						<option value="">種類を選択してください</option>
						{#each issueTypes as type}
							<option value={type.value}>{type.label}</option>
						{/each}
					</select>
				</div>

				<!-- Description -->
				<div class="form-group">
					<label for="description" class="form-label"> 詳細　Details * </label>
					<textarea
						id="description"
						bind:value={description}
						class="form-textarea"
						rows="5"
						disabled={processing}
						required
					></textarea>
					<p class="text-sm text-gray-500 mt-1">最低10文字以上で記載してください</p>
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 px-6 py-4">
				<div class="flex justify-end space-x-3">
					<button on:click={handleClose} class="btn-secondary" disabled={processing}>
						キャンセル<br />Cancel
					</button>
					<button on:click={handleSubmit} class="btn-danger" disabled={processing}>
						{#if processing}
							<div class="loading-spinner mr-2"></div>
							報告中...
						{:else}
							トラブル報告<br />Report
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
