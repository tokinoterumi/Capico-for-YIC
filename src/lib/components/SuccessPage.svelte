<script lang="ts">
	import { onMount } from 'svelte';

	export let rentalData: any;
	export let isKiosk = false;
	export let onRestart: (() => void) | null = null;

	let showQRCode = false;
	let mapUrl = '';

	onMount(() => {
		// Generate map URL with nearby locations
		generateMapUrl();

		// Show QR code only on kiosk displays
		showQRCode = isKiosk;
	});

	function generateMapUrl() {
		// Direct link to the specific parking pin
		mapUrl = `https://www.google.com/maps/search/楓の湯無料駐車場/@36.741010,138.415611,17z`;
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

	function getServiceMessage(serviceType: string): {
		title: string;
		subtitle: string;
		instructions: string[];
	} {
		switch (serviceType) {
			case 'Bike':
				return {
					title: 'レンタサイクル申込完了',
					subtitle: 'Bike Rental Reservation Completed',
					instructions: [
						'カウンターにて身分証明書のご提示と、お支払いをお願いいたします。<br/>その後、乗り場でスタッフが自転車の状態を一緒に確認します。',
						'Please present your ID and complete payment at the counter.<br/>Afterward, our staff will help you check the condition of your bicycle at the rental area.'
					]
				};
			case 'Onsen':
				return {
					title: '湯田中外湯めぐり手形申込完了',
					subtitle: 'You have successfuly reserved your Yudanaka Onsen Voucher.',
					instructions: [
						'カウンターにて身分証明書をご提示の上、お支払いを済ませてください。<br/>浴場の鍵をお渡しいたします。',
						'Please present your ID and complete your payment at the counter to receive your onsen key.'
					]
				};
			case 'Luggage':
				return {
					title: '手荷物保管申込完了',
					subtitle: 'Luggage Storage Reservation Completed',
					instructions: [
						'カウンターにてお支払いを済ませてから、お荷物をお預けください。',
						'Please complete your payment at the counter and leave your luggage with our staff.'
					]
				};
			default:
				return {
					title: '予約完了',
					subtitle: 'Reservation Completed',
					instructions: []
				};
		}
	}

	function handleRestart() {
		onRestart?.();
	}

	// Generate QR code data for kiosk display
	function generateQRData(): string {
		return JSON.stringify({
			type: 'map',
			url: mapUrl,
			location: 'Yamanouchi Tourist Information Center'
		});
	}

	$: serviceMessage = getServiceMessage(rentalData.serviceType);
</script>

<div class="kiosk-container">
	<div class="kiosk-card">
		<!-- Success Header -->
		<div class="text-center pt-4 md:pt-8">
			<div
				class="w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4"
			>
				<svg class="w-6 h-6 md:w-8 md:h-8 text-green-800" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>

			<h1 class="text-xl md:text-2xl font-bold text-green-800 mb-1 md:mb-2">
				{serviceMessage.title}
			</h1>
			<p class="text-green-800 text-base md:text-lg">
				{serviceMessage.subtitle}
			</p>
		</div>

		<!-- Reservation Details -->
		<div class="p-8 space-y-6">
			<!-- Rental ID and Service -->
			<div class="p-6 text-center">
				<div class="text-4xl mb-3">{getServiceIcon(rentalData.serviceType)}</div>
				<div class="text-sm text-gray-600">予約番号　Reservation Number</div>
				<div class="text-2xl font-bold text-gray-900 mb-2">
					{rentalData.rentalID}
				</div>
			</div>

			<!-- Service Details -->
			<div class="space-y-6">
				<!-- Top Row: Customer & Order Information -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Customer Information -->
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">お客様情報　Customer Information</h3>
						<div class="bg-slate-50 rounded-lg p-4 space-y-2">
							<div class="flex justify-between">
								<span class="text-gray-800">お名前　Name</span>
								<span class="font-medium">{rentalData.customerName}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-800">連絡先　Contact</span>
								<span class="font-medium">{rentalData.customerContact}</span>
							</div>
						</div>
					</div>

					<!-- Order Information -->
					{#if rentalData.serviceType === 'Bike'}
						<div>
							<h3 class="font-semibold text-gray-900 mb-2">レンタル詳細　Rental Details</h3>
							<div class="bg-slate-50 rounded-lg p-4 space-y-2">
								<div class="flex justify-between">
									<span class="text-gray-800">台数　Bike Count</span>
									<span class="font-medium">{rentalData.bikeCount}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-800">プラン　Rental Plan</span>
									<span class="font-medium">{rentalData.rentalPlan}</span>
								</div>
							</div>
						</div>
					{:else if rentalData.serviceType === 'Onsen'}
						<div>
							<h3 class="font-semibold text-gray-900 mb-2">人数　Number of Visitors</h3>
							<div class="bg-slate-50 rounded-lg p-4 space-y-2">
								<div class="flex justify-between">
									<span class="text-gray-800">大人　13 YO Above</span>
									<span class="font-medium">{rentalData.totalAdultCount || 0}名</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-800">小人　7~12 YO</span>
									<span class="font-medium">{rentalData.totalChildCount || 0}名</span>
								</div>
							</div>
						</div>
					{:else if rentalData.serviceType === 'Luggage'}
						<div>
							<h3 class="font-semibold text-gray-900 mb-2">お荷物詳細　Luggage Details</h3>
							<div class="bg-slate-50 rounded-lg p-4 space-y-2">
								<div class="flex justify-between">
									<span class="text-gray-600">個数　Count</span>
									<span class="font-medium">{rentalData.luggageCount}</span>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Bottom Row: Pricing Information -->
				<div>
					<h3 class="font-semibold text-gray-900 mb-2">料金　Pricing</h3>

					<div class="bg-slate-50 rounded-lg p-6 text-center">
						<div class="text-4xl font-bold text-gray-800 mb-2">
							{formatPrice(rentalData.totalPrice || 0)}
						</div>

						<div class="text-sm text-gray-800">
							税込 (Tax inc.){#if rentalData.discountApplied === true || rentalData.discountApplied === 'TRUE'}
								<div class="text-green-700 text-sm font-medium my-1">
									割引適用　Discount Applied
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Instructions -->
			<div class="border border-sky-800 rounded-lg px-5 py-4">
				<h3 class="font-semibold text-sky-900 mb-2 flex items-center">
					<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
					次のステップ　Next Steps
				</h3>
				<div class="space-y-1">
					{#each serviceMessage.instructions as instruction}
						<div class="flex items-start">
							<span class="text-sky-800">{@html instruction}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Parking Information (Onsen only) -->
			{#if rentalData?.serviceType === 'Onsen'}
				<div class="bg-blue-50 rounded-lg p-6">
					<h3 class="font-semibold text-sky-900 mb-4">駐車場情報　Parking Information</h3>
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Location Details -->
						<div class="space-y-3 text-sm">
							<div>
								<p class="font-medium text-sky-800">楓の湯無料駐車場（ローソン湯田中駅前店隣）</p>
								<p class="text-sky-800">Kaede no Yu Free Parking (Next to Lawson)</p>
							</div>
						</div>

						<!-- Map Access -->
						<div class="text-center">
							{#if showQRCode}
								<h4 class="font-medium text-blue-900 mb-3">地図 / Map</h4>
								<div
									class="w-32 h-32 bg-white border border-gray-200 rounded-lg mx-auto mb-3 flex items-center justify-center"
								>
									<!-- QR Code placeholder -->
									<svg class="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
								<p class="text-xs text-blue-600">QRコードをスキャンして地図を表示</p>
							{:else}
								<a
									href={mapUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>
									<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
											clip-rule="evenodd"
										/>
									</svg>
									地図を開く
								</a>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="pt-6 border-t border-gray-200">
				<div class="flex flex-col sm:flex-row gap-4">
					<button
						on:click={handleRestart}
						class="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors"
					>
						他のサービスを申し込む<br />Start New Reservation
					</button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	@media print {
		.kiosk-container {
			@apply min-h-0 bg-white p-0;
		}

		.kiosk-card {
			@apply max-w-none shadow-none rounded-none;
		}

		button {
			display: none !important;
		}
	}
</style>
