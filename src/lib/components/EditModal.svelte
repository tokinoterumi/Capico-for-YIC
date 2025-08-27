<script lang="ts">
	export let show: boolean = false;
	export let rental = null;
	export let onSuccess: (() => void) | null = null;
	export let onClose: (() => void) | null = null;

	let processing = false;

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

	// Form fields initialized from rental data
	let customerName = '';
	let customerContact = '';
	let bikeCount = 1;
	let rentalPlan = '';
	let bikeNumbers = [''];
	let totalAdultCount = 0;
	let totalChildCount = 0;
	let faceTowelCount = 0;
	let bathTowelCount = 0;
	let onsenKeyNumbers = [''];
	let luggageCount = 1;
	let luggageTagNumbers = [''];
	let expectedReturn = '';
	let notes = '';

	// Initialize form data when rental changes (client-side only)
	$: if (rental && show) {
		customerName = rental.customerName || '';
		customerContact = rental.customerContact || '';
		bikeCount = parseInt(rental.bikeCount) || 1;
		rentalPlan = rental.rentalPlan || '';
		// Parse bike numbers from comma-separated string or create empty array
		bikeNumbers = rental.bikeNumber ? rental.bikeNumber.split(',').map(n => n.trim()) : [''];
		totalAdultCount = parseInt(rental.totalAdultCount) || 0;
		totalChildCount = parseInt(rental.totalChildCount) || 0;
		faceTowelCount = parseInt(rental.faceTowelCount) || 0;
		bathTowelCount = parseInt(rental.bathTowelCount) || 0;
		// Parse onsen key numbers from comma-separated string or create empty array
		onsenKeyNumbers = rental.onsenKeyNumber ? rental.onsenKeyNumber.split(',').map(n => n.trim()) : [''];
		luggageCount = parseInt(rental.luggageCount) || 1;
		// Parse luggage tag numbers from comma-separated string or create empty array
		luggageTagNumbers = rental.luggageTagNumber ? rental.luggageTagNumber.split(',').map(n => n.trim()) : [''];
		expectedReturn = rental.expectedReturn || '';
		notes = rental.notes || '';
	}
	
	// Reactive statements to adjust array sizes based on counts
	$: if (bikeNumbers && bikeCount) {
		while (bikeNumbers.length < bikeCount) {
			bikeNumbers = [...bikeNumbers, ''];
		}
		if (bikeNumbers.length > bikeCount) {
			bikeNumbers = bikeNumbers.slice(0, bikeCount);
		}
	}
	
	$: if (luggageTagNumbers && luggageCount) {
		while (luggageTagNumbers.length < luggageCount) {
			luggageTagNumbers = [...luggageTagNumbers, ''];
		}
		if (luggageTagNumbers.length > luggageCount) {
			luggageTagNumbers = luggageTagNumbers.slice(0, luggageCount);
		}
	}

	async function handleSave() {
		if (!rental) return;

		processing = true;

		try {
			const updateData = {
				rentalID: rental.rentalID,
				customerName,
				customerContact,
				notes
			};

			// Add service-specific fields
			if (rental.serviceType === 'Bike') {
				updateData.bikeCount = bikeCount;
				updateData.rentalPlan = rentalPlan;
				updateData.bikeNumber = bikeNumbers.filter(n => n.trim()).join(', ');
			} else if (rental.serviceType === 'Onsen') {
				updateData.totalAdultCount = totalAdultCount;
				updateData.totalChildCount = totalChildCount;
				updateData.faceTowelCount = faceTowelCount;
				updateData.bathTowelCount = bathTowelCount;
				updateData.onsenKeyNumber = onsenKeyNumbers[0] || '';
			} else if (rental.serviceType === 'Luggage') {
				updateData.luggageCount = luggageCount;
				updateData.luggageTagNumber = luggageTagNumbers.filter(n => n.trim()).join(', ');
				updateData.expectedReturn = expectedReturn;
			}

			const response = await fetch('/api/rentals', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateData)
			});

			if (response.ok) {
				alert('更新完了 / Update completed');
				onSuccess?.();
				handleClose();
			} else {
				const error = await response.json();
				alert(`エラー / Error: ${error.error || error.message || 'Unknown error'}`);
			}
		} catch (err) {
			console.error('Update error:', err);
			alert('更新処理中にエラーが発生しました / Error during update');
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
		<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<!-- Header -->
			<div class="border-b border-gray-200 px-6 py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900">
						サービス編集<br />Edit Service Details - {rental?.rentalID || ''}
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
				<!-- Basic Information -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="customerName" class="block text-sm font-medium text-gray-700 mb-1">
							お客様名<br />Customer Name *
						</label>
						<input
							id="customerName"
							type="text"
							bind:value={customerName}
							required
							class="form-input w-full"
							placeholder="Enter customer name"
						/>
					</div>
					<div>
						<label for="customerContact" class="block text-sm font-medium text-gray-700 mb-1">
							連絡先<br />Contact
						</label>
						<input
							id="customerContact"
							type="text"
							bind:value={customerContact}
							class="form-input w-full"
							placeholder="Phone, Email or Social Media"
						/>
					</div>
				</div>

				<!-- Service-specific fields -->
				{#if rental?.serviceType === 'Bike'}
					<div class="border-t pt-4">
						<h3 class="text-lg font-medium text-gray-900 mb-4">
							レンタサイクル詳細<br />Details
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="bikeCount" class="block text-sm font-medium text-gray-700 mb-1">
									台数<br />Number of Bikes
								</label>
								<input
									id="bikeCount"
									type="number"
									min="1"
									max="10"
									bind:value={bikeCount}
									class="form-input w-full"
								/>
							</div>
							<div>
								<label for="rentalPlan" class="block text-sm font-medium text-gray-700 mb-1">
									プラン<br />Plan
								</label>
								<select id="rentalPlan" bind:value={rentalPlan} class="form-select w-full">
									<option value="2hours">2時間 / 2 Hours</option>
									<option value="3hours">3時間 / 3 Hours</option>
									<option value="4hours">4時間 / 4 Hours</option>
									<option value="fullday">1日 / Full Day</option>
								</select>
							</div>
						</div>
						<div class="mt-4">
							<label class="block text-sm font-medium text-gray-700 mb-1">
								自転車番号<br />Bike Numbers
							</label>
							<div class="space-y-2">
								{#each bikeNumbers as bikeNumber, index (index)}
									<div class="flex items-center space-x-2">
										<span class="text-sm text-gray-600 w-8">#{index + 1}</span>
										<input
											type="text"
											bind:value={bikeNumbers[index]}
											class="form-input flex-1"
											placeholder="例: 001"
										/>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else if rental?.serviceType === 'Onsen'}
					<div class="border-t pt-4">
						<h3 class="text-lg font-medium text-gray-900 mb-4">
							外湯めぐり詳細<br />Details
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="totalAdult" class="block text-sm font-medium text-gray-700 mb-1">
									大人　13 YO Above
								</label>
								<input
									id="totalAdult"
									type="number"
									min="0"
									bind:value={totalAdultCount}
									class="form-input w-full"
								/>
							</div>
							<div>
								<label for="totalChild" class="block text-sm font-medium text-gray-700 mb-1">
									小人　7~12 YO
								</label>
								<input
									id="totalChild"
									type="number"
									min="0"
									bind:value={totalChildCount}
									class="form-input w-full"
								/>
							</div>
						</div>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
							<div>
								<label for="faceTowel" class="block text-sm font-medium text-gray-700 mb-1">
									フェイスタオル　Face Towel
								</label>
								<input
									id="faceTowel"
									type="number"
									min="0"
									bind:value={faceTowelCount}
									class="form-input w-full"
								/>
							</div>
							<div>
								<label for="bathTowel" class="block text-sm font-medium text-gray-700 mb-1">
									バスタオル　Bath Towel
								</label>
								<input
									id="bathTowel"
									type="number"
									min="0"
									bind:value={bathTowelCount}
									class="form-input w-full"
								/>
							</div>
						</div>
						<div class="mt-4">
							<label for="onsenKeyNumber" class="block text-sm font-medium text-gray-700 mb-1">
								鍵番号<br />Key Number
							</label>
							<input
								id="onsenKeyNumber"
								type="text"
								bind:value={onsenKeyNumbers[0]}
								class="form-input w-full"
								placeholder="例: 01, 02, 03"
							/>
						</div>
					</div>
				{:else if rental?.serviceType === 'Luggage'}
					<div class="border-t pt-4">
						<h3 class="text-lg font-medium text-gray-900 mb-4">
							荷物預かり詳細<br />Luggage Details
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="luggageCount" class="block text-sm font-medium text-gray-700 mb-1">
									個数　Number of Items
								</label>
								<input
									id="luggageCount"
									type="number"
									min="1"
									bind:value={luggageCount}
									class="form-input w-full"
								/>
							</div>
							<div>
								<label for="expectedReturn" class="block text-sm font-medium text-gray-700 mb-1">
									お引き取り予定時刻　Expected Pickup Time
								</label>
								<select
									id="expectedReturn"
									bind:value={expectedReturn}
									class="form-select w-full"
								>
									{#each timeOptions as time}
										<option value={time}>{time}</option>
									{/each}
								</select>
							</div>
						</div>
						<div class="mt-4">
							<label class="block text-sm font-medium text-gray-700 mb-1">
								タグ番号　Tag Numbers
							</label>
							<div class="space-y-2">
								{#each luggageTagNumbers as tagNumber, index (index)}
									<div class="flex items-center space-x-2">
										<span class="text-sm text-gray-600 w-8">#{index + 1}</span>
										<input
											type="text"
											bind:value={luggageTagNumbers[index]}
											class="form-input flex-1"
										/>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- Notes -->
				<div>
					<label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
						備考　Notes
					</label>
					<textarea
						id="notes"
						bind:value={notes}
						rows="3"
						class="form-textarea w-full"
						placeholder="Additional notes..."
					></textarea>
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 px-6 py-4">
				<div class="flex justify-end space-x-3">
					<button type="button" on:click={handleClose} class="btn-secondary"> キャンセル<br/>Cancel </button>
					<button
						type="button"
						on:click={handleSave}
						class="btn-primary"
						disabled={processing || !customerName.trim()}
					>
						{@html processing ? '保存中...' : '保存<br/>Save'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
