<script>
	/** @type {{ customerName?: string, customerContact?: string, luggageCount?: number }} */
	export let data;
	/** @type {(event: { detail: any }) => void} */
	export let onComplete;
	/** @type {() => void} */
	export let onBack;

	let customerName = data.customerName || '';
	let customerContact = data.customerContact || '';
	let luggageCount = data.luggageCount || 1;
	let expectedReturn = '';

	const PRICE_PER_ITEM = 500;

	// Generate time options from 9:00 to 17:30 with 30-minute intervals
	const timeOptions = (() => {
		const options = [];
		for (let hour = 9; hour <= 17; hour++) {
			for (let minute = 0; minute < 60; minute += 30) {
				if (hour === 17 && minute > 30) break; // Stop at 17:30
				const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
				options.push(timeString);
			}
		}
		return options;
	})();

	// --- Validate expected return time ---
	$: isExpectedReturnValid = (() => {
		if (!expectedReturn) return true; // Not required, so valid if empty

		const [hours, minutes] = expectedReturn.split(':').map(Number);

		// Create date object for selected time today
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const selectedDateTime = new Date(today);
		selectedDateTime.setHours(hours, minutes, 0, 0);

		// Must not be in the past (at least current time or later)
		return selectedDateTime >= now;
	})();

	$: totalPrice = luggageCount * PRICE_PER_ITEM;
	$: isValid = customerName.trim() && customerContact.trim() && isExpectedReturnValid;

	function handleNext() {
		if (isValid && onComplete) {
			onComplete({
				detail: {
					customerName: customerName.trim(),
					customerContact: customerContact.trim(),
					documentType: 'luggage_storage', // Fixed type for luggage
					luggageCount,
					totalPrice,
					expectedReturn: expectedReturn,
					rentalPlan: 'luggage_storage' // Consistent with other services
				}
			});
		}
	}
</script>

<div class="space-y-6">
	<div class="mb-8 text-center">
		<h2 class="mb-2 text-2xl font-bold text-slate-800">荷物お預かり<br />Luggage Storage</h2>
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<!-- Customer Name -->
		<div class="form-group">
			<label for="customerName" class="form-label"> お名前<br />Name * </label>
			<input id="customerName" type="text" bind:value={customerName} class="form-input" required />
		</div>

		<!-- Contact Information -->
		<div class="form-group">
			<label for="customerContact" class="form-label">
				連絡先<br />Contact (Hotel Number is OK) *
			</label>
			<input
				id="customerContact"
				type="text"
				bind:value={customerContact}
				placeholder="Phone, Email or Social"
				class="form-input"
				required
			/>
		</div>

		<!-- Luggage Count -->
		<div class="form-group">
			<label for="luggageCount" class="form-label"> 個数<br />Number of Items * </label>
			<select id="luggageCount" bind:value={luggageCount} class="form-select max-w-xs" required>
				{#each Array(10) as _, i}
					<option value={i + 1}>
						{i + 1}
					</option>
				{/each}
			</select>
		</div>

		<!-- Expected Return Time -->
		<div class="form-group">
			<label for="expectedReturn" class="form-label">
				お引き取り予定時刻<br />Expected Pickup Time
			</label>
			<select
				id="expectedReturn"
				bind:value={expectedReturn}
				class="form-select max-w-xs {!isExpectedReturnValid ? 'border-red-500' : ''}"
			>
				<option value="">選択してください / Select Time</option>
				{#each timeOptions as time}
					<option value={time}>{time}</option>
				{/each}
			</select>
			{#if expectedReturn && !isExpectedReturnValid}
				<p class="text-xs text-red-600 mt-1">
					選択された時刻が過去の時間です<br />
					Selected time is in the past
				</p>
			{:else}
				<p class="text-xs text-gray-500 mt-1">営業時間 Business hours: 9:00-18:00</p>
			{/if}
		</div>
	</div>

	<!-- Important Information -->
	<div class="rounded-lg p-4 border">
		<div class="flex items-start">
			<div class="text-cyan-600 mr-3 mt-0.5">
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="text-sm">
				<h4 class="font-semibold text-cyan-900 mb-1">
					保管に関する重要事項<br />Important Storage Information
				</h4>
				<ul class="text-cyan-800 space-y-1">
					<li>
						現金・貴重品・壊れやすい物品のお預かりは致しかねます。<br />お荷物は本日<strong
							>18:00</strong
						>までにお引き取りください。<br />No cash, valuables, or fragile items accepted.<br
						/>Please pick up your luggage by <strong>18:00 (6 PM)</strong> today.
					</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Price Summary -->
	<div class="rounded-lg bg-slate-100 p-4">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="font-semibold text-blue-900">料金合計<br />Storage Fee</h3>
				<p class="text-sm text-blue-900">
					{luggageCount} × ¥{PRICE_PER_ITEM.toLocaleString()}
				</p>
			</div>
			<div class="text-right">
				<div class="text-2xl font-bold text-blue-900">
					¥{totalPrice.toLocaleString()}
				</div>
				<div class="text-sm text-blue-900">税込(Tax inc.)</div>
			</div>
		</div>
	</div>

	<!-- Navigation Buttons -->
	<div class="flex justify-between pt-6">
		<button type="button" on:click={onBack} class="btn-secondary"> ← 戻る<br />Back </button>
		<button
			type="button"
			on:click={handleNext}
			disabled={!isValid}
			class="btn-primary text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			申し込み完了<br />Complete Registration →
		</button>
	</div>
</div>
