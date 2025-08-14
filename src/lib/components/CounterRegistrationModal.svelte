<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let show = false;

	// 建立一個事件派發器
	const dispatch = createEventDispatcher();

	let customerName = '';
	let customerContact = '';
	let serviceType = '';
	let luggageCount = 1;
	let bikeCount = 1;
	let rentalPlan = '';

	// Onsen-specific variables
	let adultMaleCount = 1;
	let adultFemaleCount = 0;
	let childMaleCount = 0;
	let childFemaleCount = 0;
	let faceTowelCount = 0;
	let bathTowelCount = 0;
	let documentType = '';
	let companion = '';
	let expectedReturnTime = '';

	let totalPrice = 0;
	let paymentReceived = false;
	let processing = false;

	// --- Onsen pricing constants ---
	const ADULT_PRICE = 1800;
	const CHILD_PRICE = 1000;
	const ADULT_DISCOUNT_PRICE = 1600;
	const CHILD_DISCOUNT_PRICE = 900;
	const FACE_TOWEL_PRICE = 220;
	const BATH_TOWEL_PRICE = 700;

	// Document types for Onsen service
	const documentTypes = [
		{ value: 'passport', label: 'パスポート / Passport' },
		{ value: 'license', label: "運転免許証 / Driver's License" },
		{ value: 'id_card', label: '身分証明書 / ID Card' },
		{ value: 'residence_card', label: '在留カード / Residence Card' }
	];

	// --- Onsen discount logic (copied from OnsenDetails) ---
	$: discountActive = (() => {
		const now = new Date();
		const month = now.getMonth() + 1; // 1-12
		const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format

		// November-March discount (winter months)
		if (month >= 11 || month <= 3) return true;

		const oyuCleaningDates = [3, 11, 18, 27];
		const isOyuCleaningDay = oyuCleaningDates.includes(now.getDate());
		if (isOyuCleaningDay && currentTime >= 1200 && currentTime <= 1500) return true;

		// Every 6th day discount
		const anchorDate = new Date('2025-08-01T00:00:00Z');
		const anchorUTC = anchorDate.getTime();
		const todayUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		const daysSinceAnchor = Math.floor((todayUTC - anchorUTC) / (1000 * 60 * 60 * 24));
		if (daysSinceAnchor % 6 === 0) return true;

		return false;
	})();

	// Onsen calculations
	$: totalAdultCount = adultMaleCount + adultFemaleCount;
	$: totalChildCount = childMaleCount + childFemaleCount;
	$: adultUnitPrice = discountActive ? ADULT_DISCOUNT_PRICE : ADULT_PRICE;
	$: childUnitPrice = discountActive ? CHILD_DISCOUNT_PRICE : CHILD_PRICE;
	$: adultSubtotal = adultUnitPrice * totalAdultCount;
	$: childSubtotal = childUnitPrice * totalChildCount;
	$: faceTowelSubtotal = FACE_TOWEL_PRICE * faceTowelCount;
	$: bathTowelSubtotal = BATH_TOWEL_PRICE * bathTowelCount;
	$: onsenTotalPrice = adultSubtotal + childSubtotal + faceTowelSubtotal + bathTowelSubtotal;

	// --- 定義服務類型和價格 (這部分保持不變) ---
	interface ServicePricing {
		base: number;
		label: string;
		plans?: { [key: string]: { price: number; label: string } };
	}

	const servicePricing: { [key: string]: ServicePricing } = {
		Bike: {
			base: 1500,
			label: 'レンタサイクル / Bike Rental',
			plans: {
				'2hours': { price: 2000, label: '2時間 / 2 Hours' },
				'3hours': { price: 2500, label: '3時間 / 3 Hours' },
				'4hours': { price: 3000, label: '4時間 / 4 Hours' },
				fullday: { price: 4000, label: '1日 / Full Day' }
			}
		},
		Onsen: {
			base: 1800,
			label: '外湯めぐり / Onsen Pass'
		},
		Luggage: {
			base: 500,
			label: '荷物お預かり / Luggage Storage'
		}
	};

	// --- 計算總價 ---
	$: {
		if (serviceType && servicePricing[serviceType]) {
			if (serviceType === 'Bike' && rentalPlan && servicePricing.Bike.plans?.[rentalPlan]) {
				totalPrice = servicePricing.Bike.plans[rentalPlan].price * bikeCount;
			} else if (serviceType === 'Luggage') {
				totalPrice = servicePricing.Luggage.base * luggageCount;
			} else if (serviceType === 'Onsen') {
				// Use detailed Onsen calculation instead of fixed price
				totalPrice = onsenTotalPrice;
			} else {
				totalPrice = 0;
			}
		} else {
			totalPrice = 0;
		}
	}

	// --- Validate expected return time for luggage ---
	$: isExpectedReturnTimeValid = (() => {
		if (serviceType !== 'Luggage' || !expectedReturnTime) return true; // Not required, so valid if empty

		const [hours, minutes] = expectedReturnTime.split(':').map(Number);
		const selectedTime = hours * 100 + minutes; // Convert to HHMM format

		return selectedTime >= 900 && selectedTime <= 1800;
	})();

	// --- 表單驗證 ---
	$: isValid =
		customerName.trim() &&
		customerContact.trim() &&
		serviceType &&
		(serviceType !== 'Bike' || rentalPlan) &&
		(serviceType !== 'Onsen' || (documentType && (totalAdultCount > 0 || totalChildCount > 0))) &&
		isExpectedReturnTimeValid;

	// --- 當 Modal 打開時重設表單 (這部分保持不變) ---
	$: if (show) {
		resetForm();
	}

	function resetForm() {
		customerName = '';
		customerContact = '';
		serviceType = '';
		luggageCount = 1;
		bikeCount = 1;
		rentalPlan = '';
		adultMaleCount = 1;
		adultFemaleCount = 0;
		childMaleCount = 0;
		childFemaleCount = 0;
		faceTowelCount = 0;
		bathTowelCount = 0;
		documentType = '';
		companion = '';
		expectedReturnTime = '';
		totalPrice = 0;
		paymentReceived = false;
		processing = false;
	}

	// --- 處理表單提交 (修正 API 呼叫) ---
	async function handleSubmit() {
		if (!isValid) return;
		processing = true;

		try {
			// 準備要發送到後端的原始資料
			const staffInput = {
				// 加上 submissionType，讓後端知道這是員工手動建立的
				submissionType: 'STAFF_COUNTER',
				createdBy: 'staff', // This is needed for proper registration type detection

				// 基本資料
				customerName: customerName.trim(),
				customerContact: customerContact.trim(),
				serviceType: serviceType,
				totalPrice: totalPrice,

				// 根據服務類型，附加特定的資料
				...(serviceType === 'Bike' && {
					bikeCount: bikeCount,
					rentalPlan: rentalPlan
				}),
				...(serviceType === 'Luggage' && {
					luggageCount: luggageCount,
					expectedReturnTime: expectedReturnTime
				}),
				...(serviceType === 'Onsen' && {
					documentType: documentType,
					companion: companion.trim(),
					adultMaleCount: adultMaleCount,
					adultFemaleCount: adultFemaleCount,
					childMaleCount: childMaleCount,
					childFemaleCount: childFemaleCount,
					totalAdultCount: totalAdultCount,
					totalChildCount: totalChildCount,
					faceTowelCount: faceTowelCount,
					bathTowelCount: bathTowelCount,
					discountApplied: discountActive
				})
			};

			const response = await fetch('/api/rentals', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(staffInput)
			});

			if (response.ok) {
				const result = await response.json();
				const newRentalID = result.rentalId;
				alert(`カウンター登録完了 (Counter registration completed)\nID: ${newRentalID}`);

				// 派發 'success' 事件，通知父組件
				dispatch('success');
			} else {
				const error = await response.json();
				console.log('API Error Response:', error); // Debug log
				alert(`エラー (Error): ${error.error || error.message || 'Unknown error'}`);
			}
		} catch (err) {
			console.error('Counter registration submission error:', err);
			alert(
				'登録中に予期せぬエラーが発生しました (An unexpected error occurred during registration)'
			);
		} finally {
			processing = false;
		}
	}

	// --- 處理關閉事件 (修正) ---
	function handleClose() {
		// 派發一個 'close' 事件，讓父組件監聽並處理
		dispatch('close');
	}

	// --- 處理點擊背景關閉 (這部分保持不變) ---
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	function calculateExpectedReturn(): string {
		if (serviceType === 'Bike' && rentalPlan) {
			let hours = 8; // Default full day
			if (rentalPlan.includes('hours')) {
				hours = parseInt(rentalPlan.replace('hours', ''));
			}
			return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
		}
		return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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
		<div class="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
			<!-- Header -->
			<div class="border-b border-gray-200 px-6 py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900">
						カウンター登録<br />Counter Registration
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
				<!-- Customer Information -->
				<div class="form-group">
					<label for="customerName" class="form-label"> お客様名<br />Customer Name * </label>
					<input
						id="customerName"
						type="text"
						bind:value={customerName}
						class="form-input"
						disabled={processing}
						required
					/>
				</div>

				<div class="form-group">
					<label for="customerContact" class="form-label"> 連絡先<br />Contact * </label>
					<input
						id="customerContact"
						type="text"
						bind:value={customerContact}
						class="form-input"
						placeholder="Phone, Email or Social Media"
						disabled={processing}
						required
					/>
				</div>

				<!-- Service Type Selection -->
				<div class="form-group">
					<label for="serviceType" class="form-label"> サービス種類<br />Service Type * </label>
					<select
						id="serviceType"
						bind:value={serviceType}
						class="form-select"
						disabled={processing}
						required
					>
						<option value="">選択してください / Please select</option>
						{#each Object.entries(servicePricing) as [key, service]}
							<option value={key}>{service.label}</option>
						{/each}
					</select>
				</div>

				<!-- Service-Specific Fields -->
				{#if serviceType === 'Bike'}
					<!-- Document Type -->
					<div class="form-group">
						<label for="documentType" class="form-label">身分証明書<br />ID Document *</label>
						<select
							id="documentType"
							bind:value={documentType}
							class="form-select"
							disabled={processing}
							required
						>
							<option value="">選択してください / Please select</option>
							{#each documentTypes as doc}
								<option value={doc.value}>{doc.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-4">
						<div class="form-group">
							<label for="bikeCount" class="form-label"> 自転車台数<br />Number of Bikes * </label>
							<select
								id="bikeCount"
								bind:value={bikeCount}
								class="form-select"
								disabled={processing}
							>
								{#each Array(5) as _, i}
									<option value={i + 1}>{i + 1}</option>
								{/each}
							</select>
						</div>

						<div class="form-group">
							<label for="rentalPlan" class="form-label"> レンタルプラン<br />Rental Plan * </label>
							<select
								id="rentalPlan"
								bind:value={rentalPlan}
								class="form-select"
								disabled={processing}
								required
							>
								<option value="">選択してください / Please select</option>
								{#each Object.entries(servicePricing.Bike.plans || {}) as [key, plan]}
									<option value={key}>{plan.label} - ¥{plan.price.toLocaleString()}</option>
								{/each}
							</select>
						</div>
					</div>
				{:else if serviceType === 'Luggage'}
					<div class="space-y-4">
						<div class="form-group">
							<label for="luggageCount" class="form-label"> 個数<br />Number of Items * </label>
							<select
								id="luggageCount"
								bind:value={luggageCount}
								class="form-select"
								disabled={processing}
							>
								{#each Array(10) as _, i}
									<option value={i + 1}>{i + 1}</option>
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
								class="form-input {!isExpectedReturnTimeValid ? 'border-red-500' : ''}"
								min="09:30"
								max="18:00"
								disabled={processing}
							/>
							{#if expectedReturnTime && !isExpectedReturnTimeValid}
								<p class="text-xs text-red-600 mt-1">
									営業時間内（9:00-18:00）で設定してください<br />
									Please select within business hours (9:00-18:00)
								</p>
							{/if}
						</div>
					</div>
				{:else if serviceType === 'Onsen'}
					<div class="space-y-4">
						<!-- Document Type -->
						<div class="form-group">
							<label for="documentType" class="form-label">身分証明書 / ID Document *</label>
							<select
								id="documentType"
								bind:value={documentType}
								class="form-select"
								disabled={processing}
								required
							>
								<option value="">選択してください / Please select</option>
								{#each documentTypes as doc}
									<option value={doc.value}>{doc.label}</option>
								{/each}
							</select>
						</div>

						<!-- Adult Count -->
						<div class="space-y-3">
							<h4 class="font-medium text-gray-900">大人　13 YO Above</h4>
							<div class="grid grid-cols-2 gap-4">
								<div class="form-group">
									<label for="adultMale" class="form-label">男性　Male</label>
									<select
										id="adultMale"
										bind:value={adultMaleCount}
										class="form-select"
										disabled={processing}
									>
										{#each Array(6) as _, i}
											<option value={i}>{i}</option>
										{/each}
									</select>
								</div>
								<div class="form-group">
									<label for="adultFemale" class="form-label">女性　Female</label>
									<select
										id="adultFemale"
										bind:value={adultFemaleCount}
										class="form-select"
										disabled={processing}
									>
										{#each Array(6) as _, i}
											<option value={i}>{i}</option>
										{/each}
									</select>
								</div>
							</div>
						</div>

						<!-- Child Count -->
						<div class="space-y-3">
							<h4 class="font-medium text-gray-900">小人　7~12 YO</h4>
							<div class="grid grid-cols-2 gap-4">
								<div class="form-group">
									<label for="childMale" class="form-label">男の子　Boy</label>
									<select
										id="childMale"
										bind:value={childMaleCount}
										class="form-select"
										disabled={processing}
									>
										{#each Array(6) as _, i}
											<option value={i}>{i}</option>
										{/each}
									</select>
								</div>
								<div class="form-group">
									<label for="childFemale" class="form-label">女の子　Girl</label>
									<select
										id="childFemale"
										bind:value={childFemaleCount}
										class="form-select"
										disabled={processing}
									>
										{#each Array(6) as _, i}
											<option value={i}>{i}</option>
										{/each}
									</select>
								</div>
							</div>
						</div>

						<!-- Towel Rentals -->
						<div class="space-y-3">
							<h4 class="font-medium text-gray-900">タオルのご購入　Need Towel</h4>
							<div class="grid grid-cols-2 gap-4">
								<div class="form-group">
									<label for="faceTowel" class="form-label"
										>フェイスタオル ¥{FACE_TOWEL_PRICE}</label
									>
									<select
										id="faceTowel"
										bind:value={faceTowelCount}
										class="form-select"
										disabled={processing}
									>
										{#each Array(11) as _, i}
											<option value={i}>{i}</option>
										{/each}
									</select>
								</div>
								<div class="form-group">
									<label for="bathTowel" class="form-label">バスタオル ¥{BATH_TOWEL_PRICE}</label>
									<select
										id="bathTowel"
										bind:value={bathTowelCount}
										class="form-select"
										disabled={processing}
									>
										{#each Array(11) as _, i}
											<option value={i}>{i}</option>
										{/each}
									</select>
								</div>
							</div>
						</div>

						<!-- Discount Info -->
						{#if discountActive}
							<div class="bg-green-50 border border-green-200 rounded-lg p-3">
								<div class="flex items-center">
									<svg class="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clip-rule="evenodd"
										/>
									</svg>
									<span class="text-sm font-medium text-green-800">割引適用中　Discount Active</span
									>
								</div>
								<p class="text-xs text-green-700 mt-1">
									大人: ¥{adultUnitPrice.toLocaleString()}, 小人: ¥{childUnitPrice.toLocaleString()}
								</p>
							</div>
						{/if}

						<!-- Pricing Breakdown -->
						{#if totalAdultCount > 0 || totalChildCount > 0}
							<div class="bg-gray-50 rounded-lg p-3">
								<h5 class="font-medium text-gray-900 mb-2">料金内訳　Price Breakdown</h5>
								<div class="space-y-1 text-sm">
									{#if totalAdultCount > 0}
										<div class="flex justify-between">
											<span>大人 {totalAdultCount}名 × ¥{adultUnitPrice.toLocaleString()}</span>
											<span>¥{adultSubtotal.toLocaleString()}</span>
										</div>
									{/if}
									{#if totalChildCount > 0}
										<div class="flex justify-between">
											<span>子供 {totalChildCount}名 × ¥{childUnitPrice.toLocaleString()}</span>
											<span>¥{childSubtotal.toLocaleString()}</span>
										</div>
									{/if}
									{#if faceTowelCount > 0}
										<div class="flex justify-between">
											<span>フェイスタオル {faceTowelCount}枚 × ¥{FACE_TOWEL_PRICE}</span>
											<span>¥{faceTowelSubtotal.toLocaleString()}</span>
										</div>
									{/if}
									{#if bathTowelCount > 0}
										<div class="flex justify-between">
											<span>バスタオル {bathTowelCount}枚 × ¥{BATH_TOWEL_PRICE}</span>
											<span>¥{bathTowelSubtotal.toLocaleString()}</span>
										</div>
									{/if}
									<hr class="my-2" />
									<div class="flex justify-between font-medium">
										<span>合計<br />Total</span>
										<span>¥{onsenTotalPrice.toLocaleString()}</span>
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Price Display -->
				{#if totalPrice > 0}
					<div class="bg-green-50 rounded-lg p-4">
						<div class="flex justify-between items-center">
							<div>
								<h3 class="font-semibold text-green-900">料金<br />Total Price</h3>
								{#if serviceType === 'Bike' && rentalPlan}
									<p class="text-sm text-green-700">
										{servicePricing.Bike.plans?.[rentalPlan]?.label} × {bikeCount}
									</p>
								{:else if serviceType === 'Luggage'}
									<p class="text-sm text-green-700">
										お荷物 × {luggageCount}
									</p>
								{:else if serviceType === 'Onsen'}
									<p class="text-sm text-green-700">
										{#if totalAdultCount > 0}大人 {totalAdultCount}名{/if}
										{#if totalChildCount > 0}{#if totalAdultCount > 0}
												+
											{/if}小人 {totalChildCount}名{/if}
										{#if faceTowelCount > 0 || bathTowelCount > 0}
											{#if totalAdultCount > 0 || totalChildCount > 0}
												+
											{/if}タオル
										{/if}
									</p>
								{/if}
							</div>
							<div class="text-right">
								<div class="text-2xl font-bold text-green-900">
									¥{totalPrice.toLocaleString()}
								</div>
								<div class="text-sm text-green-700">税込<br />(Tax inc.)</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 px-6 py-4">
				<div class="flex justify-end space-x-3">
					<button on:click={handleClose} class="btn-secondary" disabled={processing}>
						キャンセル<br />Cancel
					</button>
					<button
						on:click={handleSubmit}
						class="btn-primary font-medium py-2 px-6 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={!isValid || processing}
						title="Debug: isValid={isValid}, processing={processing}"
					>
						{#if processing}
							<div class="loading-spinner mr-2"></div>
							登録中...
						{:else}
							登録完了<br />Complete Registration
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
