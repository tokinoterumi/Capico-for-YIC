<script lang="ts">
	import { onMount } from 'svelte';

	interface Rental {
		rentalID: string;
		serviceType: string;
		customerName: string;
		totalPrice?: number;
		bikeCount?: number;
		totalAdultCount?: number;
		totalChildCount?: number;
		luggageCount?: number;
	}

	interface CheckinData {
		rentalID: string;
		staffName: string;
		photoData: string;
		photoFileName: string;
		photoMimeType: string;
		verified: boolean;
		customerPresent: boolean;
		notes: string;
		bikeNumbers?: string[];
		onsenKeyNumbers?: string[];
		luggageTagNumbers?: string[];
	}

	interface ApiResponse {
		message: string;
	}

	interface ApiError {
		message: string;
	}

	// Props
	export let show: boolean = false;
	export let rental: Rental | null = null;
	export let onSuccess: (() => void) | null = null;
	export let onClose: (() => void) | null = null;

	// Form state
	let staffName: string = '';
	let customerPresent: boolean = true;
	let verified: boolean = true;
	let notes: string = '';
	let processing: boolean = false;

	// Staff list state
	let staffList: { id: string; name: string }[] = [];
	let loadingStaff: boolean = false;

	// Camera integration variables
	let stream: MediaStream | null = null;
	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let photoDataUrl: string | null = null;
	let cameraState: 'idle' | 'ready' | 'streaming' | 'captured' | 'error' = 'idle';
	let errorMessage = '';

	// Service-specific resource assignment
	let bikeNumbers: string[] = [];
	let onsenKeyNumbers: string[] = [];
	let luggageTagNumbers: string[] = [];

	// Available resources (in a real app, these would come from API)
	const availableBikes: string[] = ['1', '2', '3', '4', '5', '6', '7'];

	const availableOnsenKeys: string[] = [
		'136',
		'137',
		'138',
		'139',
		'140',
		'141',
		'142',
		'143',
		'144'
	];

	// Auto-generate next luggage tag number
	let nextLuggageTagNumber: number = 1;

	// Pricing constants
	const LUGGAGE_PRICE_PER_ITEM = 500;

	// Reactive pricing calculation for luggage
	$: dynamicTotalPrice =
		rental?.serviceType === 'Luggage'
			? luggageTagNumbers.length > 0 
				? luggageTagNumbers.length * LUGGAGE_PRICE_PER_ITEM
				: rental?.totalPrice || 0
			: rental?.totalPrice || 0;

	// Helper function to get Japanese service type display name
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

	onMount(() => {
		loadStaffList();

		// Load next luggage tag number (in real app, from API)
		nextLuggageTagNumber = Math.floor(Math.random() * 20) + 1;

		// Cleanup camera when component unmounts
		return () => {
			stopCamera();
		};
	});

	async function loadStaffList() {
		loadingStaff = true;
		try {
			const response = await fetch('/api/staff');
			if (response.ok) {
				const data = await response.json();
				staffList = data.staff || [];
			}
		} catch (err) {
			console.error('Error loading staff list:', err);
		} finally {
			loadingStaff = false;
		}
	}

	// Reset form when modal opens/closes
	$: if (show && rental) {
		resetForm();
		initializeResourceAssignment();
		// Set camera to ready state for non-Luggage services
		if (rental.serviceType !== 'Luggage') {
			cameraState = 'ready';
		}
	}

	function resetForm(): void {
		photoDataUrl = null;
		cameraState = 'idle';
		customerPresent = true;
		verified = true;
		notes = '';
		processing = false;
		bikeNumbers = [];
		onsenKeyNumbers = [];
		luggageTagNumbers = [];
		// Don't stop camera here since we'll auto-start it
	}

	function initializeResourceAssignment(): void {
		if (!rental) return;

		if (rental.serviceType === 'Bike') {
			// Pre-select bikes based on bike count
			bikeNumbers = availableBikes.slice(0, rental.bikeCount || 1);
		} else if (rental.serviceType === 'Onsen') {
			// Pre-select one key by default (groups can share keys)
			onsenKeyNumbers = availableOnsenKeys.slice(0, 1);
		} else if (rental.serviceType === 'Luggage') {
			// Auto-assign luggage tag numbers based on luggage count
			const count = rental.luggageCount || 1;
			luggageTagNumbers = [];
			for (let i = 0; i < count; i++) {
				luggageTagNumbers.push((nextLuggageTagNumber + i).toString().padStart(2, '0'));
			}
		}
	}

	// Check camera permissions
	async function checkCameraPermissions(): Promise<boolean> {
		try {
			if (!navigator.mediaDevices || !navigator.permissions) {
				return false;
			}

			const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
			console.log('Camera permission status:', permission.state);

			if (permission.state === 'denied') {
				errorMessage = 'カメラのアクセスが拒否されています。ブラウザの設定で許可してください。';
				cameraState = 'error';
				return false;
			}

			return true;
		} catch (error) {
			console.log('Permission check not supported or failed:', error);
			return true; // Assume allowed if we can't check
		}
	}

	// Wait for video element to be available
	async function waitForVideoElement(maxWait: number = 3000): Promise<boolean> {
		const startTime = Date.now();

		while (!videoElement && Date.now() - startTime < maxWait) {
			console.log('Waiting for video element to be available...');
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		return !!videoElement;
	}

	// Wrapper for button clicks to start camera
	function handleStartCamera() {
		startCamera();
	}

	// Camera functions
	async function startCamera(retryCount: number = 0) {
		try {
			// Wait for video element to be available
			const videoAvailable = await waitForVideoElement();
			if (!videoAvailable) {
				console.error('Video element not available after waiting');
				if (retryCount < 2) {
					console.log(`Retrying camera start, attempt ${retryCount + 1}`);
					setTimeout(() => startCamera(retryCount + 1), 1000);
					return;
				}
				errorMessage = 'カメラ要素が準備されていません。ページを再読み込みしてください。';
				cameraState = 'error';
				return;
			}

			// Check permissions first
			const hasPermission = await checkCameraPermissions();
			if (!hasPermission) {
				return;
			}

			// Stop existing stream if any
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
				stream = null;
			}

			// Request camera access with fallback constraints
			const constraints = {
				video: {
					facingMode: 'environment',
					width: { ideal: 1280 },
					height: { ideal: 720 }
				},
				audio: false
			};

			console.log('Requesting camera access with constraints:', constraints);
			stream = await navigator.mediaDevices.getUserMedia(constraints);

			// Set video source
			videoElement.srcObject = stream;

			// Wait for video to be ready
			await new Promise((resolve, reject) => {
				const timeout = setTimeout(() => reject(new Error('Video load timeout')), 5000);
				videoElement.onloadedmetadata = () => {
					clearTimeout(timeout);
					resolve(null);
				};
				videoElement.onerror = () => {
					clearTimeout(timeout);
					reject(new Error('Video load failed'));
				};
			});

			cameraState = 'streaming';
			console.log('Camera started successfully');
		} catch (error) {
			const err = error as Error & { name?: string };
			console.error('カメラの起動に失敗しました:', err);

			// Stop any stream that might have been created
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
				stream = null;
			}

			// Try fallback constraints if initial attempt failed
			if (err.name === 'OverconstrainedError') {
				console.log('Trying fallback camera constraints');
				try {
					const fallbackConstraints = {
						video: { facingMode: { ideal: 'environment' } },
						audio: false
					};
					stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
					videoElement.srcObject = stream;

					await new Promise((resolve, reject) => {
						const timeout = setTimeout(
							() => reject(new Error('Fallback video load timeout')),
							5000
						);
						videoElement.onloadedmetadata = () => {
							clearTimeout(timeout);
							resolve(null);
						};
						videoElement.onerror = () => {
							clearTimeout(timeout);
							reject(new Error('Fallback video load failed'));
						};
					});

					cameraState = 'streaming';
					console.log('Camera started successfully with fallback constraints');
					return;
				} catch (fallbackError) {
					console.error('Fallback camera attempt failed:', fallbackError);
				}
			}

			// Provide specific error messages based on error type
			if (err.name === 'NotAllowedError') {
				errorMessage =
					'カメラへのアクセスが拒否されました。ブラウザの設定でカメラの許可を有効にしてください。';
			} else if (err.name === 'NotFoundError') {
				errorMessage =
					'カメラが見つかりません。デバイスにカメラが接続されているか確認してください。';
			} else if (err.name === 'NotReadableError') {
				errorMessage =
					'カメラが他のアプリケーションで使用中です。他のアプリを閉じてから再試行してください。';
			} else if (err.name === 'OverconstrainedError') {
				errorMessage = 'カメラの設定に問題があります。別のカメラまたは設定を試してください。';
			} else {
				errorMessage = `カメラエラー: ${err.message || 'カメラの起動に失敗しました'}`;
			}

			cameraState = 'error';
		}
	}

	function capturePhoto() {
		const context = canvasElement.getContext('2d');
		if (context && videoElement) {
			// videoのサイズに合わせてcanvasのサイズを設定
			canvasElement.width = videoElement.videoWidth;
			canvasElement.height = videoElement.videoHeight;
			// canvasに現在のビデオフレームを描画
			context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
			// canvasの内容をデータURL (Base64) として取得
			photoDataUrl = canvasElement.toDataURL('image/jpeg', 0.9); // 0.9は画質

			stopCamera();
			cameraState = 'captured';
		}
	}

	function retakePhoto() {
		photoDataUrl = null;
		startCamera(); // 再びカメラを起動
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}
		// Go back to ready state for non-luggage services, idle for others
		cameraState = rental?.serviceType !== 'Luggage' ? 'ready' : 'idle';
	}

	function addBike(): void {
		const availableBike = availableBikes.find((bike) => !bikeNumbers.includes(bike));
		if (availableBike) {
			bikeNumbers = [...bikeNumbers, availableBike];
		}
	}

	function removeBike(bike: string): void {
		bikeNumbers = bikeNumbers.filter((b) => b !== bike);
	}

	function addOnsenKey(): void {
		const availableKey = availableOnsenKeys.find((key) => !onsenKeyNumbers.includes(key));
		if (availableKey) {
			onsenKeyNumbers = [...onsenKeyNumbers, availableKey];
		}
	}

	function removeOnsenKey(key: string): void {
		onsenKeyNumbers = onsenKeyNumbers.filter((k) => k !== key);
	}

	function addLuggageTag(): void {
		const nextTagNumber = (nextLuggageTagNumber + luggageTagNumbers.length)
			.toString()
			.padStart(2, '0');
		luggageTagNumbers = [...luggageTagNumbers, nextTagNumber];
	}

	function removeLuggageTag(index: number): void {
		luggageTagNumbers = luggageTagNumbers.filter((_, i) => i !== index);
	}

	function updateLuggageTag(index: number, value: string): void {
		// Only allow numeric input (remove any non-digit characters)
		const numericValue = value.replace(/\D/g, '');
		luggageTagNumbers[index] = numericValue;
		luggageTagNumbers = [...luggageTagNumbers]; // Trigger reactivity
	}

	async function handleSubmit(): Promise<void> {
		if (!validateForm()) return;

		processing = true;

		try {
			// Send the full data URL to the API (GAS backend expects the full format)
			let photoData = '';
			if (photoDataUrl) {
				photoData = photoDataUrl; // Keep the full data URL format
			}

			// Prepare checkin data
			const checkinData: CheckinData = {
				rentalID: rental!.rentalID,
				staffName: rental!.serviceType !== 'Luggage' ? staffName : '',
				photoData,
				photoFileName: photoDataUrl ? `${rental!.rentalID}_${Date.now()}.jpg` : '',
				photoMimeType: 'image/jpeg',
				verified,
				customerPresent,
				notes
			};

			// Add service-specific resource data
			if (rental!.serviceType === 'Bike') {
				checkinData.bikeNumbers = bikeNumbers;
			} else if (rental!.serviceType === 'Onsen') {
				checkinData.onsenKeyNumbers = onsenKeyNumbers;
			} else if (rental!.serviceType === 'Luggage') {
				checkinData.luggageTagNumbers = luggageTagNumbers;
			}

			// Submit to API
			const response = await fetch('/api/checkin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(checkinData)
			});

			if (response.ok) {
				const result: ApiResponse = await response.json();
				alert(`チェックイン完了 / Check-in completed: ${result.message}`);
				onSuccess?.();
				handleClose();
			} else {
				const error: ApiError = await response.json();
				alert(`エラー / Error: ${error.message}`);
			}
		} catch (err) {
			console.error('Check-in error:', err);
			alert('チェックイン処理中にエラーが発生しました / Error during check-in process');
		} finally {
			processing = false;
		}
	}

	function validateForm(): boolean {
		// Staff name only required for non-Luggage services
		if (rental!.serviceType !== 'Luggage' && !staffName.trim()) {
			alert('スタッフ名を入力してください / Please enter staff name');
			return false;
		}

		// Only require photo for non-Luggage services
		if (rental!.serviceType !== 'Luggage' && !photoDataUrl) {
			alert('身分証明書の写真を撮影してください / Please take a photo of ID document');
			return false;
		}

		if (rental!.serviceType === 'Bike' && bikeNumbers.length !== Number(rental!.bikeCount || 1)) {
			console.log('Bike validation failed:', {
				bikeNumbersLength: bikeNumbers.length,
				requiredCount: Number(rental!.bikeCount || 1),
				bikeNumbers: bikeNumbers,
				rental: rental
			});
			alert(
				`${rental!.bikeCount || 1}台の自転車を選択してください / Please select ${rental!.bikeCount || 1} bike(s) (現在: ${bikeNumbers.length}台)`
			);
			return false;
		}

		if (rental!.serviceType === 'Onsen') {
			if (onsenKeyNumbers.length === 0) {
				alert('温泉の鍵を最低1個選択してください / Please select at least 1 onsen key');
				return false;
			}
		}

		if (rental!.serviceType === 'Luggage') {
			const emptyTags = luggageTagNumbers.filter((tag) => !tag.trim());
			if (emptyTags.length > 0) {
				alert('すべての荷物タグ番号を入力してください / Please enter all luggage tag numbers');
				return false;
			}

			// Check for invalid (non-numeric) tag numbers
			const invalidTags = luggageTagNumbers.filter((tag) => !/^\d+$/.test(tag.trim()));
			if (invalidTags.length > 0) {
				alert('タグ番号は数字のみ入力してください / Tag numbers must be numeric only');
				return false;
			}

			// Check for duplicate tag numbers
			const uniqueTags = new Set(luggageTagNumbers);
			if (uniqueTags.size !== luggageTagNumbers.length) {
				alert('重複するタグ番号があります / Duplicate tag numbers found');
				return false;
			}

			// Check for invalid range (1-999)
			const outOfRangeTags = luggageTagNumbers.filter((tag) => {
				const num = parseInt(tag.trim());
				return num < 1 || num > 999;
			});
			if (outOfRangeTags.length > 0) {
				alert('タグ番号は1-999の範囲で入力してください / Tag numbers must be between 1-999');
				return false;
			}
		}

		return true;
	}

	function handleClose(): void {
		stopCamera();
		onClose?.();
	}

	// Close modal when clicking outside
	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			handleClose();
		}
	}
</script>

<!-- Modal Backdrop -->
{#if show}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		on:click={handleBackdropClick}
		on:keydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<!-- Header -->
			<div class="border-b border-gray-200 px-6 py-4">
				<div class="relative flex items-center justify-center">
					<h2 class="text-xl font-semibold text-gray-900 text-center">
						チェックイン<br />Check-in
					</h2>
					<button
						on:click={handleClose}
						class="absolute right-0 text-gray-400 hover:text-gray-500"
						disabled={processing}
						aria-label="Close modal"
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
				<!-- Rental Information -->
				{#if rental}
					<div class="bg-gray-50 rounded-lg p-4">
						<h3 class="font-medium text-gray-900 mb-2">申込内容詳細</h3>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-gray-500">ID:</span>
								<span class="font-medium">{rental.rentalID}</span>
							</div>
							<div>
								<span class="text-gray-500">サービス:</span>
								<span class="font-medium">{getServiceTypeDisplayName(rental.serviceType)}</span>
							</div>
							<div>
								<span class="text-gray-500">お客様:</span>
								<span class="font-medium">{rental.customerName}</span>
							</div>
							<div>
								<span class="text-gray-500">料金:</span>
								<span class="font-medium">¥{dynamicTotalPrice.toLocaleString()}</span>
							</div>
						</div>
					</div>
				{/if}

				<!-- Staff Information (not required for Luggage service) -->
				{#if rental?.serviceType !== 'Luggage'}
					<div class="form-group">
						<label for="staffName" class="form-label"> 担当スタッフ<br />Staff Member * </label>
						{#if loadingStaff}
							<div class="flex items-center space-x-2 p-3 border rounded-lg">
								<div class="loading-spinner"></div>
								<span class="text-sm text-gray-500">スタッフリスト読み込み中...</span>
							</div>
						{:else if staffList.length > 0}
							<select
								id="staffName"
								bind:value={staffName}
								class="form-select"
								disabled={processing}
								required
							>
								<option value="">スタッフを選択してください</option>
								{#each staffList as staff}
									<option value={staff.name}>{staff.name}</option>
								{/each}
							</select>
						{:else}
							<div class="p-3 border rounded-lg bg-yellow-50 border-yellow-200">
								<p class="text-sm text-yellow-800">スタッフが登録されていません</p>
								<p class="text-xs text-yellow-600 mt-1">管理者にスタッフの登録を依頼してください</p>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Camera Integration for ID Photo (skip for Luggage service) -->
				{#if rental?.serviceType !== 'Luggage'}
					<div class="form-group">
						<label class="form-label">身分証明書撮影<br />ID Document Photo *</label>
						<div
							class="mt-2 w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50"
						>
							<!-- Always present video and canvas elements for binding -->
							<video
								bind:this={videoElement}
								autoplay
								playsinline
								class="w-full h-full rounded-md bg-black {cameraState === 'streaming'
									? ''
									: 'hidden'}"
								style="aspect-ratio: 16/9;"
							></video>
							<canvas bind:this={canvasElement} class="hidden"></canvas>

							{#if cameraState === 'idle'}
								<div class="flex flex-col items-center justify-center py-8">
									<div class="loading-spinner mr-2"></div>
									<span class="text-gray-600 mb-4">カメラを起動中...</span>
									<button
										type="button"
										on:click={handleStartCamera}
										class="btn-secondary text-sm"
										disabled={processing}
									>
										手動でカメラを開始
									</button>
								</div>
							{:else if cameraState === 'ready'}
								<div class="flex flex-col items-center justify-center py-8">
									<svg class="w-16 h-16 text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
										<path
											d="M2 6a2 2 0 012-2h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H12a2 2 0 012 2v1a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
										></path>
										<path d="M15 9.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path>
										<path d="M2 12a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2z"
										></path>
									</svg>
									<p class="text-gray-600 mb-4 text-center">
										身分証明書の撮影準備ができました<br />カメラを起動してください
									</p>
									<button
										type="button"
										on:click={handleStartCamera}
										class="btn-primary"
										disabled={processing}
									>
										<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
											<path
												d="M2 6a2 2 0 012-2h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H12a2 2 0 012 2v1a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
											></path>
											<path d="M15 9.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path>
											<path d="M2 12a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2z"
											></path>
										</svg>
										カメラを起動
									</button>
								</div>
							{/if}

							{#if cameraState === 'streaming'}
								<div class="flex justify-center gap-3 mt-4">
									<button
										type="button"
										on:click={capturePhoto}
										class="btn-primary"
										disabled={processing}
									>
										<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM10 13a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
												clip-rule="evenodd"
											></path>
										</svg>
										撮影する
									</button>
									<button
										type="button"
										on:click={stopCamera}
										class="btn-secondary"
										disabled={processing}
									>
										カメラ停止
									</button>
								</div>
							{/if}

							{#if cameraState === 'captured' && photoDataUrl}
								<img
									src={photoDataUrl}
									alt="撮影された証明書"
									class="max-w-full max-h-48 mx-auto mb-4 rounded-md border"
								/>
								<p class="text-sm text-green-600 font-semibold">写真を確認してください</p>
								<div class="flex justify-center gap-4 mt-3">
									<button
										type="button"
										on:click={retakePhoto}
										class="btn-secondary"
										disabled={processing}>再撮影</button
									>
								</div>
							{/if}

							{#if cameraState === 'error'}
								<div class="bg-red-50 text-red-700 p-4 rounded-md">
									<p class="font-semibold">カメラエラー</p>
									<p class="text-sm">{errorMessage}</p>
									<button
										type="button"
										on:click={handleStartCamera}
										class="btn-secondary text-sm mt-2"
										disabled={processing}
									>
										再試行
									</button>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Service-Specific Resource Assignment -->
				{#if rental?.serviceType === 'Bike'}
					<div class="form-group">
						<label class="form-label" for="bike-assignment-select-0">
							自転車番号<br />Bike Assignment
						</label>
						<div class="space-y-3">
							<div class="flex flex-wrap gap-2">
								{#each bikeNumbers as bike, index}
									<div class="flex items-center space-x-1">
										<select
											id={'bike-assignment-select-' + index}
											bind:value={bikeNumbers[index]}
											class="form-select w-20"
											disabled={processing}
										>
											{#each availableBikes as availableBike}
												<option
													value={availableBike}
													disabled={bikeNumbers.includes(availableBike) && availableBike !== bike}
												>
													{availableBike}
												</option>
											{/each}
										</select>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else if rental?.serviceType === 'Onsen'}
					<div class="form-group">
						<label class="form-label" for="onsen-key-select-0">
							浴場キーナンバー<br />Key Assignment
						</label>
						<div class="space-y-3">
							<div class="flex flex-wrap gap-2">
								{#each onsenKeyNumbers as key, index}
									<div class="flex items-center space-x-1p-2">
										<select
											id={'onsen-key-select-' + index}
											bind:value={onsenKeyNumbers[index]}
											class="form-select w-24"
											disabled={processing}
										>
											{#each availableOnsenKeys as availableKey}
												<option
													value={availableKey}
													disabled={onsenKeyNumbers.includes(availableKey) && availableKey !== key}
												>
													{availableKey}
												</option>
											{/each}
										</select>
										{#if onsenKeyNumbers.length > 1}
											<button
												type="button"
												on:click={() => removeOnsenKey(key)}
												class="text-red-500 hover:text-red-700 p-1"
												disabled={processing}
												title="この鍵を削除"
											>
												<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
													<path
														fill-rule="evenodd"
														d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
														clip-rule="evenodd"
													></path>
												</svg>
											</button>
										{/if}
									</div>
								{/each}
							</div>
							{#if onsenKeyNumbers.length < availableOnsenKeys.length}
								<button on:click={addOnsenKey} class="btn-secondary text-sm" disabled={processing}>
									+ 鍵追加
								</button>
							{/if}
						</div>
					</div>
				{:else if rental?.serviceType === 'Luggage'}
					<div class="form-group">
						<label class="form-label">
							タグ番号{#if rental?.luggageCount}
								<span class="text-sm text-gray-500">（{luggageTagNumbers.length}個の荷物）</span>
							{/if}<br />Luggage Tag Numbers *
						</label>
						<div class="space-y-3">
							<div class="grid grid-cols-2 gap-3">
								{#each luggageTagNumbers as tagNumber, index}
									<div class="flex items-center space-x-2">
										<label class="text-sm text-gray-600 w-8">#{index + 1}</label>
										<input
											id={'luggageTagNumber-' + index}
											type="number"
											value={tagNumber}
											on:input={(e) =>
												updateLuggageTag(index, (e.target as HTMLInputElement)?.value || '')}
											on:keypress={(e) => {
												// Only allow digits
												if (
													!/[0-9]/.test(e.key) &&
													![
														'Backspace',
														'Delete',
														'Tab',
														'Enter',
														'ArrowLeft',
														'ArrowRight'
													].includes(e.key)
												) {
													e.preventDefault();
												}
											}}
											on:paste={(e) => {
												e.preventDefault();
												const paste = (e.clipboardData || window.clipboardData).getData('text');
												const numericOnly = paste.replace(/\D/g, '');
												if (numericOnly) {
													updateLuggageTag(index, numericOnly);
												}
											}}
											class="form-input flex-1"
											disabled={processing}
											min="1"
											max="999"
											step="1"
											pattern="[0-9]*"
											inputmode="numeric"
											required
										/>
										{#if luggageTagNumbers.length > 1}
											<button
												type="button"
												on:click={() => removeLuggageTag(index)}
												class="text-red-500 hover:text-red-700 p-1"
												disabled={processing}
												title="このタグを削除"
											>
												<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
													<path
														fill-rule="evenodd"
														d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
														clip-rule="evenodd"
													></path>
												</svg>
											</button>
										{/if}
									</div>
								{/each}
							</div>
							<button
								type="button"
								on:click={addLuggageTag}
								class="btn-secondary text-sm"
								disabled={processing}
							>
								+ タグ追加
							</button>
						</div>
					</div>
				{/if}

				<!-- Notes -->
				<div class="form-group">
					<label for="notes" class="form-label"> 備考<br />Notes </label>
					<textarea
						id="notes"
						bind:value={notes}
						class="form-textarea"
						rows="3"
						disabled={processing}
						placeholder="特記事項があれば入力してください..."
					></textarea>
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 px-6 py-4">
				<div class="flex justify-end space-x-3">
					<button on:click={handleClose} class="btn-secondary" disabled={processing}>
						キャンセル<br />Cancel
					</button>
					<button on:click={handleSubmit} class="btn-primary" disabled={processing}>
						{#if processing}
							<div class="loading-spinner mr-2"></div>
							処理中...
						{:else}
							チェックイン完了<br />Complete Check-in
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
