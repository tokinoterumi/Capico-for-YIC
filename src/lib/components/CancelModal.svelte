<script lang="ts">
	export let show: boolean = false;

	interface Rental {
		rentalID: string;
		serviceType: string;
		customerName: string;
		totalPrice?: number;
		// Add other fields as needed
	}

	export let rental: Rental | null = null;
	export let onSuccess: (() => void) | null = null;
	export let onClose: (() => void) | null = null;

	let processing = false;

	async function handleCancel() {
		if (!rental) return;

		processing = true;

		try {
			const response = await fetch(`/api/rentals?rentalID=${encodeURIComponent(rental.rentalID)}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				alert('キャンセル完了 / Cancellation completed');
				onSuccess?.();
				handleClose();
			} else {
				const error = await response.json();
				alert(`エラー / Error: ${error.error || error.message}`);
			}
		} catch (err) {
			console.error('Cancellation error:', err);
			alert('キャンセル処理中にエラーが発生しました / Error during cancellation');
		} finally {
			processing = false;
		}
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
		<div class="bg-white rounded-xl shadow-xl max-w-md w-full">
			<!-- Header -->
			<div class="border-b border-gray-200 px-6 py-4 text-center">
				<h2 class="text-xl font-semibold text-gray-900">キャンセル確認<br />Cancel Confirm</h2>
			</div>

			<!-- Content -->
			<div class="px-6 py-4">
				{#if rental}
					<div class="text-center space-y-4">
						<div class="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
							<svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>

						<div>
							<h3 class="text-lg font-medium text-gray-900 mb-2">この申込をキャンセルしますか？</h3>
							<p class="text-sm text-gray-600 mb-4">Cancel this order?</p>

							<div class="bg-gray-50 rounded-lg p-4 text-left">
								<div class="space-y-2 text-sm">
									<div class="flex justify-between">
										<span class="text-gray-500">ID:</span>
										<span class="font-medium">{rental.rentalID}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-500">Service:</span>
										<span class="font-medium">{rental.serviceType}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-500">Customer:</span>
										<span class="font-medium">{rental.customerName}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-500">Price:</span>
										<span class="font-medium">¥{rental.totalPrice?.toLocaleString()}</span>
									</div>
								</div>
							</div>
						</div>

						<p class="text-xs text-gray-500">
							この操作は取り消せません<br />This action cannot be undone
						</p>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 px-6 py-4">
				<div class="flex justify-end space-x-3">
					<button on:click={handleClose} class="btn-secondary" disabled={processing}>
						戻る<br />Back
					</button>
					<button on:click={handleCancel} class="btn-danger" disabled={processing}>
						{#if processing}
							<div class="loading-spinner mr-2"></div>
							処理中...
						{:else}
							キャンセル<br />Cancel
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
