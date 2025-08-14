<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let show = false;

	// 建立一個事件派發器
	const dispatch = createEventDispatcher();

	let hotelName = '';
	let hotelLuggageNumber = '';
	let luggageCount = 1;
	let processing = false;

	// Hotel search variables
	let hotelSearchInput = '';
	let showHotelSuggestions = false;
	let filteredHotels: string[] = [];
	let selectedIndex = -1;

	// Complete list of approved Yudanaka-Shibu ryokans
	const yudanakaShibuRyokans = [
		'ホテル椿野',
		'よろづや',
		'華灯りの宿　加命迺湯',
		'和風の宿ますや',
		'一乃湯果亭',
		'御宿炭乃湯',
		'松籟荘',
		'歴史の宿　金具屋',
		'白雲楼',
		'清風荘',
		'山の内ヒルズ',
		'ホテルゆだなか',
		'楽奇温泉旅館',
		'ZEN Hostel',
		'HOSTEL AIBIYA',
		'湯田中湯本',
		'まるか旅館',
		'あさひ翠泉荘',
		'島屋',
		'下田屋',
		'御園ホテル',
		'一茶のこみち美湯の宿',
		'味な湯宿やすらぎ',
		'旅館はくら',
		'石庭露天風呂の宿　俵や',
		'ホテル水明館',
		'せせらぎの宿　ホテル星川館',
		'志なのや',
		'魚敏旅館',
		'ホテル豊生',
		'あぶらや燈千',
		'つるや旅館',
		'風間館',
		'湯の原旅館',
		'ホテルおもだか',
		'部屋食の宿 安代館',
		'塵表閣',
		'山崎屋',
		'味乃宿　ふじや旅館',
		'ひなの宿安楽荘',
		'政喜旅館',
		'真田家旧本陣つばたや旅館',
		'もやいの宿　いかり屋旅館',
		'貸切露天の宿　大丸屋',
		'御宿小澤屋',
		'若木屋',
		'旅の宿　初の湯',
		'天川荘',
		'月見の湯山一屋',
		'御宿ひしや寅蔵',
		'渋白銀屋旅館',
		'小石屋旅館',
		'玉久旅館',
		'大陽館ヤマト屋',
		'丸善旅館',
		'洗心館松屋',
		'の猿HOSTEL',
		'湯本旅館',
		'渋ホテル',
		'春蘭の宿さかえや',
		'古久屋',
		'金喜ホテル',
		'よろづや旅館　渋温泉',
		'かめや旅館',
		'御宿多喜本',
		'新栄館',
		'かどや',
		'不動尊の湯ことぶき',
		'塵表閣本店',
		'上林ホテル仙壽閣',
		'湯宿せきや',
		'山の湯',
		'地獄谷温泉後楽館',
		'越後屋旅館',
		'ようだや旅館',
		'高島屋旅館',
		'福島屋',
		'角間荘',
		'傳習館とらやの湯',
		'民宿志賀',
		'くつの館',
		'民宿みやま',
		'ゲストハウス穂波街道'
	];

	// Hotel search functionality - filter and show results when typing
	$: {
		if (hotelSearchInput.trim()) {
			const searchTerm = hotelSearchInput.toLowerCase();
			filteredHotels = yudanakaShibuRyokans
				.filter((hotel) => hotel.toLowerCase().includes(searchTerm))
				.slice(0, 10); // Limit to 10 suggestions for better UX
			selectedIndex = -1; // Reset selection when search changes
			// Show dropdown when typing and we have results
			showHotelSuggestions = filteredHotels.length > 0;
		} else {
			// When field is empty, only show dropdown if explicitly opened by click
			selectedIndex = -1;
			// Keep current dropdown state, don't automatically hide
		}
	}

	// No pricing for hotel luggage - they use pre-purchased vouchers
	$: isValid = Boolean(hotelName && hotelLuggageNumber && hotelLuggageNumber.trim().length > 0);

	// Reset form when modal opens
	$: if (show) {
		resetForm();
	}

	function resetForm() {
		hotelName = '';
		hotelSearchInput = '';
		hotelLuggageNumber = '';
		luggageCount = 1;
		processing = false;
		showHotelSuggestions = false;
		filteredHotels = [];
		selectedIndex = -1;
	}

	// Hotel selection functions
	function selectHotel(hotel: string) {
		hotelName = hotel;
		hotelSearchInput = hotel;
		showHotelSuggestions = false;
		filteredHotels = [];
		selectedIndex = -1;
	}

	function handleHotelInputFocus() {
		// Don't automatically show dropdown on focus, let click handle it
		if (hotelSearchInput.trim() && filteredHotels.length > 0) {
			showHotelSuggestions = true;
		}
	}

	function toggleDropdown(event?: Event) {
		if (showHotelSuggestions) {
			showHotelSuggestions = false;
			selectedIndex = -1;
		} else {
			// Show dropdown with hotels - either filtered or all
			if (hotelSearchInput.trim()) {
				const searchTerm = hotelSearchInput.toLowerCase();
				filteredHotels = yudanakaShibuRyokans
					.filter((hotel) => hotel.toLowerCase().includes(searchTerm))
					.slice(0, 10);
			} else {
				filteredHotels = yudanakaShibuRyokans.slice(0, 10);
			}
			showHotelSuggestions = true;
			selectedIndex = -1;
		}
	}

	function handleHotelInputBlur() {
		// Only hide if not clicking on the input field itself or dropdown
		setTimeout(() => {
			const activeElement = document.activeElement;
			const isInputFocused = activeElement?.id === 'hotelSearchInput';
			const isDropdownClick = activeElement?.closest('.hotel-dropdown');

			if (!isInputFocused && !isDropdownClick) {
				showHotelSuggestions = false;
				selectedIndex = -1;
			}
		}, 150);
	}

	// Keyboard navigation functions
	function handleKeyDown(event: KeyboardEvent) {
		if (!showHotelSuggestions || filteredHotels.length === 0) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, filteredHotels.length - 1);
				scrollToSelected();
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				scrollToSelected();
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0 && selectedIndex < filteredHotels.length) {
					selectHotel(filteredHotels[selectedIndex]);
				}
				break;
			case 'Escape':
				event.preventDefault();
				showHotelSuggestions = false;
				selectedIndex = -1;
				break;
		}
	}

	function scrollToSelected() {
		if (selectedIndex >= 0) {
			const dropdown = document.querySelector('.hotel-dropdown');
			const selectedElement = dropdown?.children[selectedIndex] as HTMLElement;
			if (selectedElement && dropdown) {
				const dropdownRect = dropdown.getBoundingClientRect();
				const selectedRect = selectedElement.getBoundingClientRect();

				if (selectedRect.bottom > dropdownRect.bottom) {
					selectedElement.scrollIntoView({ block: 'end', behavior: 'smooth' });
				} else if (selectedRect.top < dropdownRect.top) {
					selectedElement.scrollIntoView({ block: 'start', behavior: 'smooth' });
				}
			}
		}
	}

	async function handleSubmit() {
		if (!isValid) return;

		processing = true;

		try {
			const hotelLuggageData = {
				submissionType: 'HOTEL_PARTNERSHIP',
				serviceType: 'Luggage',

				hotelName,
				hotelTagNumbers: hotelLuggageNumber.trim(),
				luggageCount: luggageCount,
				totalPrice: 0
			};

			const response = await fetch('/api/rentals', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(hotelLuggageData)
			});

			if (response.ok) {
				const result = await response.json();
				alert(`ホテル手荷物登録完了 / Hotel luggage registered\nID: ${result.rentalId}`);

				dispatch('success');
			} else {
				const error = await response.json();
				alert(`エラー / Error: ${error.message}`);
			}
		} catch (err) {
			console.error('Hotel luggage registration error:', err);
			alert('登録中にエラーが発生しました / Error during registration');
		} finally {
			processing = false;
		}
	}

	function handleClose() {
		dispatch('close');
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
		<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<!-- Header -->
			<div class="border-b border-gray-200 px-6 py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900 flex items-center">
						お荷物保管代行<br /> Hotel Luggage Registration
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
				<!-- Partnership Notice -->
				<div class="p-4">
					<div class="flex items-start">
						<svg class="w-5 h-5 text-blue-700 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
								clip-rule="evenodd"
							/>
						</svg>
						<div class="text-sm">
							<p class="text-blue-800">
								旅館様よりお客様のお荷物をお預かりします。<br
								/>前払いシールで精算済みのため、支払手続きは不要です。<br />
							</p>
							<p class="text-blue-800 text-xs mt-1">
								This is for registering luggage from partner hotels using prepaid voucher stickers.<br
								/>
								Payment has already been collected, so no transaction is needed at this time.
							</p>
						</div>
					</div>
				</div>

				<!-- Hotel Selection with Search -->
				<div class="form-group">
					<label for="hotelSearchInput" class="form-label"> 宿名<br /> Hotel Name* </label>
					<div class="relative">
						<input
							id="hotelSearchInput"
							type="text"
							bind:value={hotelSearchInput}
							on:focus={handleHotelInputFocus}
							on:blur={handleHotelInputBlur}
							on:keydown={handleKeyDown}
							on:click={toggleDropdown}
							class="form-input pr-10 cursor-pointer"
							disabled={processing}
							autocomplete="off"
							required
							aria-expanded={showHotelSuggestions}
							aria-haspopup="listbox"
							role="combobox"
						/>

						<!-- Dropdown arrow indicator -->
						<div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
							<svg
								class="w-4 h-4 text-gray-400 transition-transform duration-200 {showHotelSuggestions
									? 'rotate-180'
									: ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</div>

						<!-- Search suggestions dropdown -->
						{#if showHotelSuggestions && filteredHotels.length > 0}
							<div
								class="hotel-dropdown absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
								role="listbox"
							>
								{#each filteredHotels as hotel, index}
									<button
										type="button"
										class="w-full px-4 py-2 text-left border-b border-gray-100 last:border-b-0 focus:outline-none transition-colors duration-150 {index ===
										selectedIndex
											? 'bg-blue-50 text-blue-900 border-blue-200'
											: 'hover:bg-gray-50 text-gray-900'}"
										on:click={() => selectHotel(hotel)}
										on:mouseenter={() => (selectedIndex = index)}
										role="option"
										aria-selected={index === selectedIndex}
									>
										<span class="text-sm font-medium">{hotel}</span>
									</button>
								{/each}

								{#if filteredHotels.length === 10}
									<div
										class="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-100 bg-gray-50"
									>
										<svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
												clip-rule="evenodd"
											/>
										</svg>
										さらに文字を入力して絞り込んでください<br />Type more to refine search
									</div>
								{/if}

								<!-- Keyboard navigation hint -->
								<div
									class="px-4 py-2 text-xs text-gray-400 text-center border-t border-gray-100 bg-gray-25"
								>
									↑↓ 選択 • Enter 決定 • Esc キャンセル
								</div>
							</div>
						{/if}

						<!-- Selected hotel display -->
						{#if hotelName && hotelName !== hotelSearchInput}
							<div class="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
								<span class="text-green-800">選択済み: {hotelName}</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Luggage Count and Number - Horizontal Layout -->
				<div class="form-group">
					<div class="flex flex-wrap gap-4">
						<!-- Luggage Count -->
						<div class="flex-1 min-w-32">
							<label for="luggageCount" class="block text-sm font-medium text-gray-700 mb-1">
								個数<br />Count
							</label>
							<select
								id="luggageCount"
								bind:value={luggageCount}
								class="form-select w-full"
								disabled={processing}
							>
								{#each Array(10) as _, i}
									<option value={i + 1}>{i + 1}</option>
								{/each}
							</select>
						</div>

						<!-- Hotel Luggage Number -->
						<div class="flex-1 min-w-48">
							<label for="hotelLuggageNumber" class="block text-sm font-medium text-gray-700 mb-1">
								番号<br />Number
							</label>
							<input
								id="hotelLuggageNumber"
								type="text"
								bind:value={hotelLuggageNumber}
								class="form-input w-full"
								disabled={processing}
								required
							/>
						</div>
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
						class="btn-primary font-medium py-2 px-6 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={!isValid || processing}
						title="Debug: isValid={isValid}, processing={processing}"
					>
						{#if processing}
							<div class="loading-spinner mr-2"></div>
							登録中...
						{:else}
							登録完了<br />Submit
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
