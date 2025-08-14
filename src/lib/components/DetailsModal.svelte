<script lang="ts">
	export let show = false;
	export let rental: any = null;
	export let onClose: (() => void) | null = null;

	// Format dates for display
	function formatDateTime(dateString: string): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		// Check if the date is valid
		if (isNaN(date.getTime())) {
			return '無効な日付 / Invalid Date';
		}
		return (
			date.toLocaleDateString('ja-JP') +
			' ' +
			date.toLocaleTimeString('ja-JP', {
				hour: '2-digit',
				minute: '2-digit'
			})
		);
	}

	function formatPrice(price: number): string {
		return `¥${price.toLocaleString()}`;
	}

	function getServiceIcon(serviceType: string): string {
		switch (serviceType) {
			case 'Bike':
				return '🚲';
			case 'Onsen':
				return '♨️';
			case 'Luggage':
				return '🧳';
			default:
				return '📋';
		}
	}

	function getDocumentTypeDisplayName(documentType: string): string {
		switch (documentType) {
			case 'passport':
				return 'パスポート';
			case 'driver_license':
				return '運転免許証';
			case 'national_id':
				return 'マイナンバーカード';
			case 'residence_card':
				return '在留カード';
			case 'student_id':
				return '学生証';
			case 'other':
				return 'その他身分証明書';
			default:
				return documentType || '身分証明書';
		}
	}

	function getServiceTypeDisplayName(serviceType: string): string {
		switch (serviceType) {
			case 'Bike':
				return 'レンタサイクル';
			case 'Onsen':
				return '外湯めぐり';
			case 'Luggage':
				return '荷物お預かり';
			default:
				return serviceType;
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'Pending':
				return 'bg-amber-100 text-amber-800';
			case 'Awaiting_Storage':
				return 'bg-indigo-100 text-indigo-800';
			case 'Active':
				return 'bg-green-100 text-green-800';
			case 'Troubled':
				return 'bg-red-100 text-red-800';
			case 'Closed':
			case 'Closed (Picked Up)':
				return 'bg-gray-100 text-gray-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
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

	// Print function for receipts
	function handlePrint() {
		window.print();
	}
</script>

<!-- Modal Backdrop -->
{#if show && rental}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		on:click={handleBackdropClick}
		on:keydown={(e) => e.key === 'Escape' && handleClose()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
			<!-- Header -->
			<div class="border-b border-gray-200 px-6 py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900 flex items-center">
						<span class="text-2xl mr-3">{getServiceIcon(rental.serviceType)}</span>
						レンタル詳細<br />Rental Details
					</h2>
					<div class="flex items-center space-x-3">
						<button
							on:click={handlePrint}
							class="btn-secondary text-sm no-print"
							title="印刷 / Print"
						>
							<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zM5 14H4v-3h1v3zm6 0H9v2H7v-2H5v2a0 0 0 000 0h6a0 0 0 000 0v-2z"
									clip-rule="evenodd"
								/>
							</svg>
							印刷
						</button>
						<button on:click={handleClose} class="text-gray-400 hover:text-gray-500 no-print">
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
			</div>

			<!-- Content -->
			<div class="px-6 py-6 space-y-8">
				<!-- Basic Information -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<!-- Left Column -->
					<div class="space-y-6">
						<!-- Rental ID and Status -->
						<div class="bg-gray-50 rounded-lg p-4">
							<h3 class="font-semibold text-gray-900 mb-3">基本情報<br />Basic Information</h3>
							<div class="space-y-3">
								<div class="flex justify-between items-center">
									<span class="text-gray-600">レンタルID</span>
									<span class="font-mono font-medium">{rental.rentalID}</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-gray-600">ステータス</span>
									<span
										class="px-2 py-1 rounded-full text-xs font-medium {getStatusColor(
											rental.status
										)}"
									>
										{rental.status}
									</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-gray-600">サービス</span>
									<span class="font-medium">{getServiceTypeDisplayName(rental.serviceType)}</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-gray-600">料金</span>
									<span class="font-semibold text-lg">{formatPrice(rental.totalPrice || 0)}</span>
								</div>
							</div>
						</div>

						<!-- Customer Information -->
						<div class="bg-blue-50 rounded-lg p-4">
							<h3 class="font-semibold text-gray-900 mb-3">お客様情報<br />Customer Information</h3>
							<div class="space-y-3">
								<div>
									<span class="text-gray-600 block">お名前</span>
									<span class="font-medium">{rental.customerName}</span>
								</div>
								<div>
									<span class="text-gray-600 block">連絡先</span>
									<span class="font-medium">{rental.customerContact}</span>
								</div>
								{#if rental.serviceType !== 'Luggage' && rental.documentType}
									<div>
										<span class="text-gray-600 block">身分証明書</span>
										<span class="font-medium"
											>{getDocumentTypeDisplayName(rental.documentType)}</span
										>
									</div>
								{/if}
								{#if rental.companion}
									<div>
										<span class="text-gray-600 block">同行者</span>
										<span class="font-medium">{rental.companion}</span>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Right Column -->
					<div class="space-y-6">
						<!-- Service-Specific Details -->
						<div class="bg-green-50 rounded-lg p-4">
							<h3 class="font-semibold text-gray-900 mb-3">サービス詳細<br />Service Details</h3>

							{#if rental.serviceType === 'Bike'}
								<div class="space-y-3">
									<div class="flex justify-between">
										<span class="text-gray-600">台数<br />Count:</span>
										<span class="font-medium">{rental.bikeCount}台</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-600">プラン<br />Plan:</span>
										<span class="font-medium">{rental.rentalPlan}</span>
									</div>
									{#if rental.bikeNumber}
										<div>
											<span class="text-gray-600 block">自転車番号 / Bike Numbers:</span>
											<span class="font-medium font-mono">{rental.bikeNumber}</span>
										</div>
									{/if}
								</div>
							{:else if rental.serviceType === 'Onsen'}
								<div class="space-y-3">
									<div class="flex justify-between">
										<span class="text-gray-600">大人　13 YO Above</span>
										<span class="font-medium">{rental.totalAdultCount || 0}名</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-600">小人　7~12 YO</span>
										<span class="font-medium">{rental.totalChildCount || 0}名</span>
									</div>
									{#if rental.adultMaleCount || rental.adultFemaleCount}
										<div class="text-sm text-gray-600">
											<div>
												男性 {rental.adultMaleCount || 0}名 / 女性 {rental.adultFemaleCount || 0}名
											</div>
											<div>
												男の子 {rental.childMaleCount || 0}名 / 女の子 {rental.childFemaleCount ||
													0}名
											</div>
										</div>
									{/if}
									{#if rental.faceTowelCount || rental.bathTowelCount}
										<div>
											<span class="text-gray-600 block">タオル　Towels</span>
											<div class="text-sm">
												{#if rental.faceTowelCount > 0}フェイス　{rental.faceTowelCount}枚{/if}
												{#if rental.bathTowelCount > 0}バス　{rental.bathTowelCount}枚{/if}
											</div>
										</div>
									{/if}
									{#if rental.onsenKeyNumber}
										<div>
											<span class="text-gray-600 block">鍵番号　Key Numbers</span>
											<span class="font-medium font-mono">{rental.onsenKeyNumber}</span>
										</div>
									{/if}
									{#if rental.discountApplied === true || rental.discountApplied === 'TRUE'}
										<div class="text-green-600 text-sm font-medium">
											割引適用済み<br />Discount Applied
										</div>
									{/if}
								</div>
							{:else if rental.serviceType === 'Luggage'}
								<div class="space-y-3">
									<div class="flex justify-between">
										<span class="text-gray-600">個数</span>
										<span class="font-medium">{rental.luggageCount}個</span>
									</div>
									{#if rental.luggageTagNumber}
										<div>
											<span class="text-gray-600 block">タグ番号</span>
											<span class="font-medium font-mono">{rental.luggageTagNumber}</span>
										</div>
									{/if}
									{#if rental.isHotelPartnership}
										<div class="bg-purple-100 rounded p-2">
											<div class="text-purple-800 text-sm font-medium">お荷物保管代行</div>
											{#if rental.partnerHotel}
												<div class="text-sm">宿名　{rental.partnerHotel}</div>
											{/if}
										</div>
									{/if}
									{#if rental.expectedReturn}
										<div>
											<span class="text-gray-600 block">予定返却日時<br />Scheduled Return</span>
											<span class="font-medium">{formatDateTime(rental.expectedReturn)}</span>
										</div>
									{/if}
								</div>
							{/if}
						</div>

						<!-- Timeline -->
						<div class="bg-gray-50 rounded-lg p-4">
							<h3 class="font-semibold text-gray-900 mb-3">タイムライン<br />Timeline</h3>
							<div class="space-y-3 text-sm">
								<div class="flex justify-between">
									<span class="text-gray-600">登録日時</span>
									<span>{formatDateTime(rental.submittedAt)}</span>
								</div>
								{#if rental.checkedInAt}
									<div class="flex justify-between">
										<span class="text-gray-600">チェックイン</span>
										<span>{formatDateTime(rental.checkedInAt)}</span>
									</div>
									{#if rental.checkInStaff && rental.serviceType !== 'Luggage'}
										<div class="flex justify-between text-xs">
											<span class="text-gray-500">担当スタッフ</span>
											<span>{rental.checkInStaff}</span>
										</div>
									{/if}
								{/if}
								{#if rental.returnedAt}
									<div class="flex justify-between">
										<span class="text-gray-600">返却完了</span>
										<span>{formatDateTime(rental.returnedAt)}</span>
									</div>
									{#if rental.returnStaff && rental.serviceType !== 'Luggage'}
										<div class="flex justify-between text-xs">
											<span class="text-gray-500">担当スタッフ</span>
											<span>{rental.returnStaff}</span>
										</div>
									{/if}
								{:else if rental.storedAt}
									<div class="flex justify-between">
										<span class="text-gray-600">保管完了</span>
										<span>{formatDateTime(rental.storedAt)}</span>
									</div>
									{#if rental.storageStaff && rental.serviceType !== 'Luggage'}
										<div class="flex justify-between text-xs">
											<span class="text-gray-500">担当スタッフ</span>
											<span>{rental.storageStaff}</span>
										</div>
									{/if}
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Trouble Information -->
				{#if rental.troubleNotes}
					<div class="border-t border-gray-200"></div>
					<div class="bg-red-50 border-red-200 p-4 rounded-lg">
						<h4 class="font-medium text-red-900 mb-2">
							トラブル詳細<br />Trouble Information
						</h4>
						<div>
							<p class="text-sm text-red-800">{rental.troubleNotes}</p>
							{#if rental.troubleResolved !== undefined && rental.status === 'Troubled'}
								<div class="mt-2">
									<span class="px-2 py-1 rounded text-xs bg-red-100 text-red-800"> 対応中 </span>
								</div>
							{:else if rental.troubleResolved !== undefined}
								<div class="mt-2">
									<span
										class="px-2 py-1 rounded text-xs {rental.troubleResolved
											? 'bg-green-100 text-green-800'
											: 'bg-red-100 text-red-800'}"
									>
										{rental.troubleResolved ? '解決済み' : '対応中'}
									</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 px-6 py-4 no-print">
				<div class="flex justify-end">
					<button on:click={handleClose} class="btn-primary"> 閉じる<br />Close </button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@media print {
		.no-print {
			display: none !important;
		}

		.bg-white {
			background: white !important;
		}

		.shadow-xl {
			box-shadow: none !important;
		}

		.rounded-xl {
			border-radius: 0 !important;
		}
	}
</style>
