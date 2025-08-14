<script>
	export let data;
	/** @type {(event: { detail: any }) => void} */
	export let onComplete;
	export let onBack;

	let customerName = data.customerName || '';
	let customerContact = data.customerContact || '';
	let documentType = data.documentType || '';
	let adultMaleCount = data.adultMaleCount || 1;
	let adultFemaleCount = data.adultFemaleCount || 0;
	let childMaleCount = data.childMaleCount || 0;
	let childFemaleCount = data.childFemaleCount || 0;
	let faceTowelCount = data.faceTowelCount || 0;
	let bathTowelCount = data.bathTowelCount || 0;
	let origin = data.origin || '';
	let prefecture = data.prefecture || '';

	const documentTypes = [
		{ value: 'license', label: "運転免許証 / Driver's License" },
		{ value: 'passport', label: 'パスポート / Passport' },
		{ value: 'id_card', label: '身分証明書 / ID Card' },
		{ value: 'residence_card', label: '在留カード / Residence Card' },
		{ value: 'others', label: 'その他 / Others' }
	];

	const originOptions = [
		{ value: '日本国内', label: '日本国内 / Japan' },
		{ value: '海外', label: '海外 / Overseas' }
	];

	const prefectures = [
		'北海道',
		'青森県',
		'岩手県',
		'宮城県',
		'秋田県',
		'山形県',
		'福島県',
		'茨城県',
		'栃木県',
		'群馬県',
		'埼玉県',
		'千葉県',
		'東京都',
		'神奈川県',
		'新潟県',
		'富山県',
		'石川県',
		'福井県',
		'山梨県',
		'長野県',
		'岐阜県',
		'静岡県',
		'愛知県',
		'三重県',
		'滋賀県',
		'京都府',
		'大阪府',
		'兵庫県',
		'奈良県',
		'和歌山県',
		'鳥取県',
		'島根県',
		'岡山県',
		'広島県',
		'山口県',
		'徳島県',
		'香川県',
		'愛媛県',
		'高知県',
		'福岡県',
		'佐賀県',
		'長崎県',
		'熊本県',
		'大分県',
		'宮崎県',
		'鹿児島県',
		'沖縄県'
	];

	$: if (origin === '海外') {
		prefecture = '';
	}

	$: comeFrom = origin === '海外' ? '海外' : prefecture;

	const ADULT_PRICE = 1800;
	const CHILD_PRICE = 1000;
	const ADULT_DISCOUNT_PRICE = 1600;
	const CHILD_DISCOUNT_PRICE = 900;
	const FACE_TOWEL_PRICE = 220;
	const BATH_TOWEL_PRICE = 700;

	// --- Discount Calculation Logic ---

	/**
	 * Checks the cleaning schedule for all public baths and returns discount information.
	 * @returns {{isDiscounted: boolean, unavailableBaths: string[]}}
	 */
	function getDiscountInfo() {
		const now = new Date();
		const today = now.getDate();
		const month = now.getMonth() + 1; // 1-12
		const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format
		const unavailable = [];

		// Rule 1: Ōyu (大湯)
		const oyuCleaningDates = [3, 11, 18, 27];
		const oyuSpecialDates = [
			{ month: 5, day: 7 },
			{ month: 10, day: 7 },
			{ month: 12, day: 30 }
		];
		const isOyuCleaningDay =
			oyuCleaningDates.includes(today) ||
			oyuSpecialDates.some((d) => d.month === month && d.day === today);
		if (isOyuCleaningDay && currentTime >= 900 && currentTime < 1600) {
			unavailable.push('大湯（Ōyu）');
		}

		// Rule 2: Wata-no-yu (綿の湯)
		const anchorDate = new Date('2025-08-01T00:00:00Z');
		const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
		const anchorUTC = Date.UTC(
			anchorDate.getUTCFullYear(),
			anchorDate.getUTCMonth(),
			anchorDate.getUTCDate()
		);
		const daysSinceAnchor = Math.floor((todayUTC - anchorUTC) / (1000 * 60 * 60 * 24));
		if (daysSinceAnchor % 2 === 0 && currentTime >= 1000 && currentTime < 1300) {
			unavailable.push('綿の湯（Wata no Yu）');
		}

		// Rule 3: Kakke-no-yu (脚気の湯)
		if (today % 2 === 0 && currentTime >= 1000 && currentTime < 1300) {
			unavailable.push('脚気の湯（Kakke no Yu）');
		}

		return {
			isDiscounted: unavailable.length > 0,
			unavailableBaths: unavailable
		};
	}

	// --- Reactive Svelte Statements ---
	$: discountInfo = getDiscountInfo();
	$: discountActive = discountInfo.isDiscounted;
	$: unavailableBathsList = discountInfo.unavailableBaths.join('、');

	$: totalAdultCount = adultMaleCount + adultFemaleCount;
	$: totalChildCount = childMaleCount + childFemaleCount;
	$: adultUnitPrice = discountActive ? ADULT_DISCOUNT_PRICE : ADULT_PRICE;
	$: childUnitPrice = discountActive ? CHILD_DISCOUNT_PRICE : CHILD_PRICE;
	$: adultSubtotal = adultUnitPrice * totalAdultCount;
	$: childSubtotal = childUnitPrice * totalChildCount;
	$: faceTowelSubtotal = FACE_TOWEL_PRICE * faceTowelCount;
	$: bathTowelSubtotal = BATH_TOWEL_PRICE * bathTowelCount;
	$: totalPrice = adultSubtotal + childSubtotal + faceTowelSubtotal + bathTowelSubtotal;
	$: isValid =
		customerName.trim() &&
		customerContact.trim() &&
		documentType &&
		(totalAdultCount > 0 || totalChildCount > 0);

	function handleNext() {
		if (isValid && onComplete) {
			onComplete({
				detail: {
					customerName: customerName.trim(),
					customerContact: customerContact.trim(),
					documentType,
					origin,
					prefecture,
					comeFrom,
					adultMaleCount,
					adultFemaleCount,
					childMaleCount,
					childFemaleCount,
					totalAdultCount,
					totalChildCount,
					faceTowelCount,
					bathTowelCount,
					totalPrice,
					rentalPlan: 'onsen_pass',
					discountApplied: discountActive,
					unavailableBaths: discountInfo.unavailableBaths
				}
			});
		}
	}
</script>

<div class="space-y-6">
	<div class="mb-8 text-center">
		<h2 class="mb-2 text-2xl font-bold text-slate-800">
			湯田中外湯めぐり手形<br />Yudanaka Onsen Tour Pass
		</h2>
	</div>

	<!-- REFINED: Discount Notice -->
	{#if discountActive}
		<div class="rounded-lg p-4">
			<div class="flex items-start">
				<div class="text-green-800 mr-3 mt-0.5">
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="text-sm">
					<h4 class="font-semibold text-green-900 mb-1">
						割引適用中！<br />{unavailableBathsList}
						が清掃中のため、特別価格でご提供します。
					</h4>
					<p class="text-green-900">
						Special pricing is active because {unavailableBathsList}is/are under maintenance.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<!-- Customer Name -->
		<div class="form-group">
			<label for="customerName" class="form-label"> お名前<br />Name * </label>
			<input id="customerName" type="text" bind:value={customerName} class="form-input" required />
		</div>

		<!-- Contact Information -->
		<div class="form-group">
			<label for="customerContact" class="form-label">
				連絡先<br />Contact (Hotel Number is OK)*
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

		<!-- Origin -->
		<div class="form-group">
			<label for="origin" class="form-label">
				どちらからお越しですか？<br />Where do you come from?
			</label>
			<select id="origin" bind:value={origin} class="form-select">
				<option value="">選択してください / Please select</option>
				{#each originOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<!-- Prefecture (only show if origin is Japan) -->
		{#if origin === '日本国内'}
			<div class="form-group">
				<label for="prefecture" class="form-label"> 都道府県<br />Prefecture </label>
				<select id="prefecture" bind:value={prefecture} class="form-select">
					<option value="">選択してください / Please select</option>
					{#each prefectures as pref}
						<option value={pref}>{pref}</option>
					{/each}
				</select>
			</div>
		{/if}
	</div>

	<!-- Pass Quantities -->
	<div class="rounded-lg bg-gray-50 p-6">
		<h3 class="text-lg font-semibold text-gray-900 mb-4">枚数<br />Quantities</h3>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Adult Section -->
			<div class="space-y-4">
				<h4 class="font-medium text-gray-800 border-b border-gray-300 pb-2">
					大人 <br />13 YO Above
				</h4>

				<!-- Adult Male -->
				<div class="form-group">
					<label for="adultMaleCount" class="form-label"> 男性<br />Male </label>
					<div class="flex items-center justify-between">
						<select id="adultMaleCount" bind:value={adultMaleCount} class="form-select flex-1">
							{#each Array(10) as _, i}
								<option value={i}>{i}</option>
							{/each}
						</select>
						<div class="ml-4 text-right">
							<div class="font-semibold text-gray-900">
								¥{adultUnitPrice.toLocaleString()}
								{#if discountActive}
									<span class="text-sm text-green-600 line-through ml-1"
										>¥{ADULT_PRICE.toLocaleString()}</span
									>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Adult Female -->
				<div class="form-group">
					<label for="adultFemaleCount" class="form-label"> 女性<br />Female </label>
					<div class="flex items-center justify-between">
						<select id="adultFemaleCount" bind:value={adultFemaleCount} class="form-select flex-1">
							{#each Array(10) as _, i}
								<option value={i}>{i}</option>
							{/each}
						</select>
						<div class="ml-4 text-right">
							<div class="font-semibold text-gray-900">
								¥{adultUnitPrice.toLocaleString()}
								{#if discountActive}
									<span class="text-sm text-green-600 line-through ml-1"
										>¥{ADULT_PRICE.toLocaleString()}</span
									>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Child Section -->
			<div class="space-y-4">
				<h4 class="font-medium text-gray-800 border-b border-gray-300 pb-2">
					小人<br />Child (7-12 YO)
				</h4>

				<!-- Child Male -->
				<div class="form-group">
					<label for="childMaleCount" class="form-label"> 男の子<br />Boy </label>
					<div class="flex items-center justify-between">
						<select id="childMaleCount" bind:value={childMaleCount} class="form-select flex-1">
							{#each Array(10) as _, i}
								<option value={i}>{i}</option>
							{/each}
						</select>
						<div class="ml-4 text-right">
							<div class="font-semibold text-gray-900">
								¥{childUnitPrice.toLocaleString()}
								{#if discountActive}
									<span class="text-sm text-green-600 line-through ml-1"
										>¥{CHILD_PRICE.toLocaleString()}</span
									>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Child Female -->
				<div class="form-group">
					<label for="childFemaleCount" class="form-label"> 女の子<br />Girl </label>
					<div class="flex items-center justify-between">
						<select id="childFemaleCount" bind:value={childFemaleCount} class="form-select flex-1">
							{#each Array(10) as _, i}
								<option value={i}>{i}</option>
							{/each}
						</select>
						<div class="ml-4 text-right">
							<div class="font-semibold text-gray-900">
								¥{childUnitPrice.toLocaleString()}
								{#if discountActive}
									<span class="text-sm text-green-600 line-through ml-1"
										>¥{CHILD_PRICE.toLocaleString()}</span
									>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Towel Add-ons -->
	<div class="rounded-lg bg-gray-50 p-6">
		<h3 class="text-lg font-semibold text-gray-900 mb-4">
			タオルのご購入<br />Need Towel (Optional)
		</h3>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<!-- Face Towel -->
			<div class="form-group">
				<label for="faceTowelCount" class="form-label"> フェイスタオル<br />Face Towel </label>
				<div class="flex items-center justify-between">
					<select id="faceTowelCount" bind:value={faceTowelCount} class="form-select flex-1">
						{#each Array(11) as _, i}
							<option value={i}>{i}</option>
						{/each}
					</select>
					<div class="ml-4 text-right">
						<div class="font-semibold text-gray-900">¥{FACE_TOWEL_PRICE.toLocaleString()}</div>
					</div>
				</div>
			</div>

			<!-- Bath Towel -->
			<div class="form-group">
				<label for="bathTowelCount" class="form-label"> バスタオル<br />Bath Towel </label>
				<div class="flex items-center justify-between">
					<select id="bathTowelCount" bind:value={bathTowelCount} class="form-select flex-1">
						{#each Array(11) as _, i}
							<option value={i}>{i}</option>
						{/each}
					</select>
					<div class="ml-4 text-right">
						<div class="font-semibold text-gray-900">¥{BATH_TOWEL_PRICE.toLocaleString()}</div>
					</div>
				</div>
			</div>
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
				<h4 class="font-semibold text-cyan-900 mb-1">重要なお知らせ<br />Important Information</h4>
				<ul class="text-cyan-800 space-y-1">
					<li>
						共同浴場の鍵は、手形をご購入された当日のみ貸出・返却が可能です。<br
						/>なお、手形に含まれた楓の湯入浴券は有効期限はありません。楓の湯窓口に手形をご提示ください。<br
						/>共同浴場は、清掃によりご利用できない時間帯がございます。<br
						/>共同浴場の鍵は17:30までにご返却ください。
					</li>
					<li>
						Please note that keys for the public bathhouses must be borrowed and returned on the day
						you purchase the pass. <br />The included ticket for the other onsen facility never
						expires and can be used anytime. <br />Bathhouses in maintenance are not available.<br
						/>All keys must be returned by 17:30 (5:30 PM).
					</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Price Summary -->
	{#if totalPrice > 0}
		<div class="rounded-lg bg-slate-100 p-4">
			<h3 class="font-semibold text-blue-900 mb-3">料金内訳<br />Price Breakdown</h3>

			<div class="space-y-2 text-sm">
				{#if totalAdultCount > 0}
					<div class="flex justify-between">
						<span
							>大人 {totalAdultCount}名<br />13 YO Above {totalAdultCount} × ¥{adultUnitPrice.toLocaleString()}</span
						>
						<span>¥{adultSubtotal.toLocaleString()}</span>
					</div>
					{#if adultMaleCount > 0 && adultFemaleCount > 0}
						<div class="flex justify-between text-xs text-gray-600 ml-4">
							<span
								>└ 男性 {adultMaleCount}名　女性 {adultFemaleCount}名　Male {adultMaleCount}, Female {adultFemaleCount}</span
							>
							<span></span>
						</div>
					{/if}
				{/if}

				{#if totalChildCount > 0}
					<div class="flex justify-between">
						<span
							>小人 {totalChildCount}名<br />7~12 YO {totalChildCount} × ¥{childUnitPrice.toLocaleString()}</span
						>
						<span>¥{childSubtotal.toLocaleString()}</span>
					</div>
					{#if childMaleCount > 0 && childFemaleCount > 0}
						<div class="flex justify-between text-xs text-gray-600 ml-4">
							<span
								>└ 男の子 {childMaleCount}名　女の子 {childFemaleCount}名　Boy {childMaleCount},
								Girl {childFemaleCount}</span
							>
							<span></span>
						</div>
					{/if}
				{/if}

				{#if faceTowelCount > 0}
					<div class="flex justify-between">
						<span
							>フェイスタオル<br />Face Towel {faceTowelCount} × ¥{FACE_TOWEL_PRICE.toLocaleString()}</span
						>
						<span>¥{faceTowelSubtotal.toLocaleString()}</span>
					</div>
				{/if}

				{#if bathTowelCount > 0}
					<div class="flex justify-between">
						<span
							>バスタオル<br />Towel {bathTowelCount} × ¥{BATH_TOWEL_PRICE.toLocaleString()}</span
						>
						<span>¥{bathTowelSubtotal.toLocaleString()}</span>
					</div>
				{/if}
			</div>

			<div class="border-t border-blue-200 mt-3 pt-3">
				<div class="flex justify-between items-center">
					<span class="font-semibold text-blue-900">合計<br />Total</span>
					<div class="text-right">
						<div class="text-2xl font-bold text-blue-900">
							¥{totalPrice.toLocaleString()}
						</div>
						<div class="text-sm text-blue-900">税込<br />(Tax inc.)</div>
					</div>
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
