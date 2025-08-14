<script>
	export let data;
	export let onComplete;
	export let onBack;

	let customerName = data.customerName || '';
	let customerContact = data.customerContact || '';
	let documentType = data.documentType || '';
	let bikeCount = data.bikeCount || 1;
	let rentalPlan = data.rentalPlan || '';

	const rentalPlans = [
		{ value: '2hours', label: '2時間 / 2 Hours', price: 2000 },
		{ value: '3hours', label: '3時間 / 3 Hours', price: 2500 },
		{ value: '4hours', label: '4時間 / 4 Hours', price: 3000 },
		{ value: 'fullday', label: '1日 / Full Day', price: 4000 }
	];

	const documentTypes = [
		{ value: 'drivinglicense', label: "運転免許証 / Driver's License" },
		{ value: 'passport', label: 'パスポート / Passport' },
		{ value: 'mynumber', label: 'マイナンバーカード / My Number Card' },
		{ value: 'residence_card', label: '在留カード / Residence Card' },
		{ value: 'others', label: 'その他 / Others' }
	];

	$: selectedPlan = rentalPlans.find((p) => p.value === rentalPlan);
	$: totalPrice = selectedPlan ? selectedPlan.price * bikeCount : 0;
	$: isValid = customerName.trim() && customerContact.trim() && documentType && rentalPlan;

	function handleNext() {
		if (isValid && onComplete) {
			onComplete({
				detail: {
					customerName: customerName.trim(),
					customerContact: customerContact.trim(),
					documentType,
					bikeCount,
					rentalPlan,
					totalPrice
				}
			});
		}
	}
</script>

<div class="space-y-6">
	<div class="mb-8 text-center">
		<h2 class="mb-2 text-2xl font-bold text-slate-800">レンタル詳細<br />Rental Details</h2>
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
				placeholder="Phone, Email or Social Media"
				class="form-input"
				required
			/>
		</div>

		<!-- Document Type -->
		<div class="form-group">
			<label for="documentType" class="form-label">
				身分証明書の種類<br />ID Document Type *
			</label>
			<select id="documentType" bind:value={documentType} class="form-select" required>
				<option value="">選択してください / Please select</option>
				{#each documentTypes as doc}
					<option value={doc.value}>{doc.label}</option>
				{/each}
			</select>
		</div>


		<!-- Bike Count -->
		<div class="form-group">
			<label for="bikeCount" class="form-label"> 自転車の台数<br />Number of Bikes * </label>
			<select id="bikeCount" bind:value={bikeCount} class="form-select" required>
				{#each Array(7) as _, i}
					<option value={i + 1}>{i + 1}</option>
				{/each}
			</select>
		</div>

		<!-- Rental Plan -->
		<div class="form-group">
			<label for="rentalPlan" class="form-label"> レンタルプラン<br />Rental Plan * </label>
			<select id="rentalPlan" bind:value={rentalPlan} class="form-select" required>
				<option value="">選択してください / Please select</option>
				{#each rentalPlans as plan}
					<option value={plan.value}>
						{plan.label} - ¥{plan.price.toLocaleString()}
					</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Price Summary -->
	{#if totalPrice > 0}
		<div class="rounded-lg bg-slate-100 p-4">
			<div class="flex justify-between items-center">
				<div>
					<h3 class="font-semibold text-blue-900">料金合計<br />Total Price</h3>
					<p class="text-sm text-blue-900">
						{selectedPlan?.label} × {bikeCount}
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
	{/if}

	<!-- Navigation Buttons -->
	<div class="flex justify-between pt-6">
		<button type="button" on:click={onBack} class="btn-secondary"> ← 戻る<br />Back </button>
		<button
			type="button"
			on:click={handleNext}
			disabled={!isValid}
			class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
		>
			次へ<br />Next →
		</button>
	</div>
</div>
