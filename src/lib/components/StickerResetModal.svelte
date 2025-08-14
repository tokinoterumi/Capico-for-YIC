<script lang="ts">
	export let show = false;
	export let currentTagNumber = 20;
	export let sheetLimit = 20;
	export let onConfirm: (() => void) | null = null;
	export let onClose: (() => void) | null = null;

	let physicalSheetReplaced = false;
	let newSheetNumber = '';
	let staffName = '';
	let staff = [];
	let selectedStaffId = '';
	let loadingStaff = false;
	let notes = '';
	let processing = false;

	// Reset form when modal opens
	$: if (show) {
		resetForm();
		loadStaff();
	}

	async function loadStaff() {
		if (loadingStaff) return;
		
		loadingStaff = true;
		try {
			const response = await fetch('/api/staff');
			if (response.ok) {
				const data = await response.json();
				staff = (data.staff || []).sort((a, b) => (a.order || 0) - (b.order || 0));
			}
		} catch (err) {
			console.error('Error loading staff:', err);
		} finally {
			loadingStaff = false;
		}
	}

	function resetForm() {
		physicalSheetReplaced = false;
		newSheetNumber = '';
		selectedStaffId = '';
		staffName = '';
		notes = '';
		processing = false;
	}

	function handleStaffChange() {
		const selectedStaff = staff.find(s => s.id === selectedStaffId);
		staffName = selectedStaff ? selectedStaff.name : '';
	}

	async function handleConfirm() {
		if (!validateForm()) return;

		processing = true;

		try {
			// Here you would typically call an API to reset the counter
			// For now, we'll simulate the process
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Call the parent's confirm handler
			onConfirm?.();

			alert(
				`スティッカーシートリセット完了\nSticker sheet reset completed\n新シート番号: ${newSheetNumber || 'デフォルト'}`
			);
			handleClose();
		} catch (err) {
			console.error('Sticker reset error:', err);
			alert('リセット処理中にエラーが発生しました / Error during reset process');
		} finally {
			processing = false;
		}
	}

	function validateForm(): boolean {
		if (!physicalSheetReplaced) {
			alert(
				'物理的なスティッカーシートの交換を確認してください / Please confirm physical sticker sheet replacement'
			);
			return false;
		}

		if (!staffName.trim()) {
			alert('スタッフ名を入力してください / Please enter staff name');
			return false;
		}

		return true;
	}

	function handleClose() {
		onClose?.();
	}

	// Close modal when clicking outside
	function handleBackdropClick(event: MouseEvent) {
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
		<div class="bg-white rounded-xl shadow-xl max-w-lg w-full">
			<!-- Header -->
			<div class="border-b border-gray-200 px-6 py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900 flex items-center">
						<svg class="w-6 h-6 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
						スティッカーシートリセット
					</h2>
					<button
						on:click={handleClose}
						class="text-gray-400 hover:text-gray-500"
						disabled={processing}
						aria-label="閉じる / Close"
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
				<!-- Current Status -->
				<div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
					<div class="flex items-start">
						<svg
							class="w-5 h-5 text-orange-600 mr-2 mt-0.5"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
								clip-rule="evenodd"
							/>
						</svg>
						<div class="text-sm">
							<h4 class="font-medium text-orange-900 mb-1">
								シート交換が必要です / Sheet Replacement Required
							</h4>
							<p class="text-orange-800">
								現在のタグ番号: <strong>{currentTagNumber}</strong><br />
								シート上限: <strong>{sheetLimit}</strong><br />
								次に必要な番号が上限を超えています。
							</p>
							<p class="text-orange-700 text-xs mt-1">
								Current tag number: {currentTagNumber} / Sheet limit: {sheetLimit}<br />
								Next required number exceeds sheet limit.
							</p>
						</div>
					</div>
				</div>

				<!-- Physical Confirmation -->
				<div class="bg-red-50 border border-red-200 rounded-lg p-4">
					<h3 class="font-semibold text-red-900 mb-3 flex items-center">
						<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
						物理的作業の確認 / Physical Work Confirmation
					</h3>

					<div class="space-y-4">
						<!-- Replacement Checklist -->
						<div class="space-y-3">
							<div class="flex items-start space-x-3">
								<div
									class="w-5 h-5 bg-gray-100 border border-gray-300 rounded flex items-center justify-center mt-0.5"
								>
									<span class="text-xs text-gray-600">1</span>
								</div>
								<div class="text-sm">
									<p class="text-gray-900">古いスティッカーシートを取り除きました</p>
									<p class="text-gray-600 text-xs">Removed old sticker sheet</p>
								</div>
							</div>

							<div class="flex items-start space-x-3">
								<div
									class="w-5 h-5 bg-gray-100 border border-gray-300 rounded flex items-center justify-center mt-0.5"
								>
									<span class="text-xs text-gray-600">2</span>
								</div>
								<div class="text-sm">
									<p class="text-gray-900">新しいスティッカーシートを設置しました</p>
									<p class="text-gray-600 text-xs">Installed new sticker sheet</p>
								</div>
							</div>

							<div class="flex items-start space-x-3">
								<div
									class="w-5 h-5 bg-gray-100 border border-gray-300 rounded flex items-center justify-center mt-0.5"
								>
									<span class="text-xs text-gray-600">3</span>
								</div>
								<div class="text-sm">
									<p class="text-gray-900">番号1から開始できることを確認しました</p>
									<p class="text-gray-600 text-xs">Confirmed ready to start from number 1</p>
								</div>
							</div>
						</div>

						<!-- Final Confirmation -->
						<div class="pt-3 border-t border-red-200">
							<label class="flex items-start space-x-3">
								<input
									type="checkbox"
									bind:checked={physicalSheetReplaced}
									class="form-checkbox mt-1"
									disabled={processing}
								/>
								<div class="text-sm">
									<p class="font-medium text-red-900">上記の作業をすべて完了しました</p>
									<p class="text-red-700 text-xs">I have completed all the above tasks</p>
								</div>
							</label>
						</div>
					</div>
				</div>

				<!-- Staff Information -->
				<div class="form-group">
					<label for="staffSelection" class="form-label"> 担当スタッフ / Staff Member * </label>
					<select
						id="staffSelection"
						bind:value={selectedStaffId}
						on:change={handleStaffChange}
						class="form-input"
						disabled={processing || loadingStaff}
						required
					>
						<option value="">スタッフを選択 / Select Staff</option>
						{#each staff as member}
							<option value={member.id}>{member.name}</option>
						{/each}
					</select>
					{#if loadingStaff}
						<p class="text-sm text-gray-500 mt-1">スタッフ読み込み中...</p>
					{/if}
				</div>

				<!-- New Sheet Number (Optional) -->
				<div class="form-group">
					<label for="newSheetNumber" class="form-label">
						新シート番号 / New Sheet Number (Optional)
					</label>
					<input
						id="newSheetNumber"
						type="text"
						bind:value={newSheetNumber}
						class="form-input"
						placeholder="例: S-2024-02"
						disabled={processing}
					/>
					<p class="text-sm text-gray-500 mt-1">在庫管理用の識別番号があれば入力してください</p>
				</div>

				<!-- Notes -->
				<div class="form-group">
					<label for="notes" class="form-label"> 備考 / Notes (Optional) </label>
					<textarea
						id="notes"
						bind:value={notes}
						class="form-textarea"
						rows="3"
						disabled={processing}
						placeholder="特記事項があれば記載してください..."
					></textarea>
				</div>

				<!-- Warning -->
				<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
					<div class="flex items-start">
						<svg
							class="w-5 h-5 text-yellow-600 mr-2 mt-0.5"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
						<div class="text-sm">
							<h4 class="font-medium text-yellow-900 mb-1">重要な注意事項 / Important Notice</h4>
							<p class="text-yellow-800">
								この操作により、システムのタグカウンターが1にリセットされます。物理的なシート交換が完了していることを必ず確認してください。
							</p>
							<p class="text-yellow-700 text-xs mt-1">
								This action will reset the system tag counter to 1. Please ensure physical sheet
								replacement is completed.
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 px-6 py-4">
				<div class="flex justify-end space-x-3">
					<button on:click={handleClose} class="btn-secondary" disabled={processing}>
						キャンセル / Cancel
					</button>
					<button
						on:click={handleConfirm}
						class="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={!physicalSheetReplaced || processing}
					>
						{#if processing}
							<div class="loading-spinner mr-2"></div>
							リセット中...
						{:else}
							カウンターリセット / Reset Counter
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
