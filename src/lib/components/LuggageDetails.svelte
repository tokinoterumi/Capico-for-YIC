<script>
	/** @type {{ customerName?: string, customerContact?: string, luggageCount?: number }} */
	export let data;
	/** @type {(event: { detail: any }) => void} */
	export let onComplete;
	/** @type {() => void} */
	export let onBack;
	export const simplified = false; // For external reference only

	let customerName = data.customerName || '';
	let customerContact = data.customerContact || '';
	let luggageCount = data.luggageCount || 1;
	let expectedReturnTime = '';

	const PRICE_PER_ITEM = 500;

	// --- Validate expected return time ---
	$: isExpectedReturnTimeValid = (() => {
		if (!expectedReturnTime) return true; // Not required, so valid if empty

		const [hours, minutes] = expectedReturnTime.split(':').map(Number);
		const selectedTime = hours * 100 + minutes; // Convert to HHMM format

		// Business hours: 9:00 AM to 6:00 PM (900 to 1800)
		return selectedTime >= 900 && selectedTime <= 1800;
	})();

	$: totalPrice = luggageCount * PRICE_PER_ITEM;
	$: isValid = customerName.trim() && customerContact.trim() && isExpectedReturnTimeValid;

	function handleNext() {
		if (isValid && onComplete) {
			onComplete({
				detail: {
					customerName: customerName.trim(),
					customerContact: customerContact.trim(),
					documentType: 'luggage_storage', // Fixed type for luggage
					luggageCount,
					totalPrice,
					expectedReturnTime: expectedReturnTime,
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
			<label for="expectedReturnTime" class="form-label">
				お引き取り予定時刻<br />Expected Pickup Time
			</label>
			<input
				id="expectedReturnTime"
				type="time"
				bind:value={expectedReturnTime}
				class="form-input max-w-xs {!isExpectedReturnTimeValid ? 'border-red-500' : ''}"
				min="09:00"
				max="18:00"
			/>
			{#if expectedReturnTime && !isExpectedReturnTimeValid}
				<p class="text-xs text-red-600 mt-1">
					営業時間内（9:00-18:00）で設定してください<br />
					Please select within business hours (9:00-18:00)
				</p>
			{:else}
				<p class="text-xs text-gray-500 mt-1">営業時間 Business hours: 9:00-18:00</p>
			{/if}
		</div>
	</div>

	<!-- Important Information -->
	<div class="rounded-lg p-4 border border-amber-700">
		<div class="flex items-start">
			<div class="text-amber-600 mr-3 mt-0.5">
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="text-sm">
				<h4 class="font-semibold text-amber-900 mb-1">
					保管に関する重要事項<br />Important Storage Information
				</h4>
				<ul class="text-amber-800 space-y-1">
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
