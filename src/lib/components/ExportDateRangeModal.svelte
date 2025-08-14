<script>
	export let show = false;
	export let onClose = null;
	export let onExport = null;

	let startDate = '';
	let endDate = '';

	// Set default date range to current month
	function setDefaultDates() {
		const now = new Date();
		const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
		const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		startDate = firstDay.toISOString().split('T')[0];
		endDate = lastDay.toISOString().split('T')[0];
	}

	// Initialize dates when modal opens
	$: if (show && !startDate && !endDate) {
		setDefaultDates();
	}

	function handleExport() {
		if (!startDate || !endDate) {
			alert('開始日と終了日を選択してください');
			return;
		}

		if (new Date(startDate) > new Date(endDate)) {
			alert('開始日は終了日より前の日付を選択してください');
			return;
		}

		onExport?.({ startDate, endDate });
		handleClose();
	}

	function handleClose() {
		startDate = '';
		endDate = '';
		onClose?.();
	}

	function setDateRange(type) {
		const now = new Date();
		const today = now.toISOString().split('T')[0];

		switch (type) {
			case 'today':
				startDate = today;
				endDate = today;
				break;
			case 'yesterday':
				const yesterday = new Date(now);
				yesterday.setDate(now.getDate() - 1);
				const yesterdayStr = yesterday.toISOString().split('T')[0];
				startDate = yesterdayStr;
				endDate = yesterdayStr;
				break;
			case 'thisWeek':
				const startOfWeek = new Date(now);
				startOfWeek.setDate(now.getDate() - now.getDay());
				startDate = startOfWeek.toISOString().split('T')[0];
				endDate = today;
				break;
			case 'thisMonth':
				setDefaultDates();
				break;
			case 'lastMonth':
				const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
				const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
				startDate = lastMonth.toISOString().split('T')[0];
				endDate = lastMonthEnd.toISOString().split('T')[0];
				break;
		}
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
			<div class="border-b border-gray-200 px-6 py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900">
						外湯めぐりデータ出力<br />
						Export Yudanaka Onsen Tour Data
					</h2>
					<button on:click={handleClose} class="text-gray-400 hover:text-gray-500">
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
			<div class="px-6 py-6 space-y-6">
				<!-- Quick Date Range Buttons -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-3">
						クイック選択　Quick Select
					</label>
					<div class="grid grid-cols-2 gap-2">
						<button
							type="button"
							on:click={() => setDateRange('today')}
							class="btn-secondary text-sm py-2"
						>
							今日
						</button>
						<button
							type="button"
							on:click={() => setDateRange('yesterday')}
							class="btn-secondary text-sm py-2"
						>
							昨日
						</button>
						<button
							type="button"
							on:click={() => setDateRange('thisWeek')}
							class="btn-secondary text-sm py-2"
						>
							今週
						</button>
						<button
							type="button"
							on:click={() => setDateRange('thisMonth')}
							class="btn-secondary text-sm py-2"
						>
							今月
						</button>
						<button
							type="button"
							on:click={() => setDateRange('lastMonth')}
							class="btn-secondary text-sm py-2 col-span-2"
						>
							先月
						</button>
					</div>
				</div>

				<!-- Start Date -->
				<div>
					<label for="startDate" class="block text-sm text-gray-600 mb-1">
						開始日　Start Date
					</label>
					<input
						id="startDate"
						type="date"
						bind:value={startDate}
						class="form-input w-full"
						required
					/>
				</div>

				<!-- End Date -->
				<div>
					<label for="endDate" class="block text-sm text-gray-600 mb-1"> 終了日　End Date </label>
					<input id="endDate" type="date" bind:value={endDate} class="form-input w-full" required />
				</div>

				<!-- Date Range Summary -->
				{#if startDate && endDate}
					<div class="bg-blue-50 rounded-lg p-3">
						<div class="text-sm text-blue-800">
							<strong>選択期間:</strong>
							{new Date(startDate).toLocaleDateString('ja-JP')} ～
							{new Date(endDate).toLocaleDateString('ja-JP')}
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 px-6 py-4">
				<div class="flex justify-end space-x-3">
					<button type="button" on:click={handleClose} class="btn-secondary"> キャンセル </button>
					<button
						type="button"
						on:click={handleExport}
						class="btn-primary flex items-center space-x-2"
						disabled={!startDate || !endDate}
					>
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
						<span>出力</span>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
