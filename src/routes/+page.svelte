<!-- src/routes/+page.svelte - The main customer-facing form -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import FormWrapper from '$lib/components/FormWrapper.svelte';
	import Step1ServiceSelection from '$lib/components/Step1_ServiceSelection.svelte';
	import BikeDetails from '$lib/components/BikeDetails.svelte';
	import OnsenDetails from '$lib/components/OnsenDetails.svelte';
	import LuggageDetails from '$lib/components/LuggageDetails.svelte';
	import BikeAgreement from '$lib/components/BikeAgreement.svelte';
	import OnsenAgreement from '$lib/components/OnsenAgreement.svelte';
	import SuccessPage from '$lib/components/SuccessPage.svelte';

	interface FormData {
		customerName: string;
		customerContact: string;
		documentType: string;
		companion: string;
		bikeCount: number;
		rentalPlan: string;
		totalPrice: number;
		expectedReturn: string;
		agreement: boolean;
		serviceType: string;
		rentalID?: string;
	}

	interface ServiceSelectionEvent {
		detail: {
			service: string;
		};
	}

	interface DetailsCompleteEvent {
		detail: Partial<FormData>;
	}

	interface AgreementCompleteEvent {
		detail: Partial<FormData>;
	}

	// Component prop types
	type ComponentCallback = (() => void) | null;
	type EventCallback<T> = ((event: T) => void) | null;

	interface SubmissionData extends FormData {
		rentalID: string;
		status: string;
		submittedAt: string;
	}

	let currentStep: number = 1;
	let selectedService: string = '';
	let formData: FormData = {
		customerName: '',
		customerContact: '',
		documentType: '',
		companion: '',
		bikeCount: 1,
		rentalPlan: '',
		totalPrice: 0,
		expectedReturn: '',
		agreement: false,
		serviceType: ''
	};
	let isKiosk: boolean = false;
	let submitted: boolean = false;

	// Total steps change based on service type (Luggage skips agreement)
	$: totalSteps = selectedService === 'Luggage' ? 2 : 3;

	onMount(() => {
		// Modern SvelteKit approach using reactive statement with $page store
		isKiosk = $page.url.searchParams.get('kiosk') === 'true';
		
		// Check if this is an admin PWA launch
		const adminParam = $page.url.searchParams.get('admin');
		if (adminParam === 'true') {
			// Redirect to admin panel
			window.location.href = '/admin';
		}
	});

	// Alternative approach using reactive statement (runs when $page changes)
	$: if ($page && $page.url) {
		isKiosk = $page.url.searchParams.get('kiosk') === 'true';
	}

	function handleServiceSelection(event: ServiceSelectionEvent): void {
		console.log('Service selection:', event.detail.service);
		selectedService = event.detail.service;
		formData.serviceType = selectedService;
		currentStep = 2;
		console.log('Current step after service selection:', currentStep);
	}

	function handleDetailsComplete(event: DetailsCompleteEvent): void {
		console.log('Details complete:', event.detail);
		formData = { ...formData, ...event.detail };
		if (selectedService === 'Luggage') {
			formData.agreement = true; // Auto-accept for luggage
			submitForm();
		} else {
			currentStep = 3;
			console.log('Current step after details complete:', currentStep);
		}
	}

	function handleAgreementComplete(event: AgreementCompleteEvent): void {
		formData = { ...formData, ...event.detail };
		submitForm();
	}

	// Wrapper functions to match component prop types
	const handleServiceSelectionCallback: EventCallback<ServiceSelectionEvent> =
		handleServiceSelection;
	const handleDetailsCompleteCallback: EventCallback<DetailsCompleteEvent> = handleDetailsComplete;
	const handleAgreementCompleteCallback: EventCallback<AgreementCompleteEvent> =
		handleAgreementComplete;
	const goBackCallback: ComponentCallback = goBack;
	const resetFormCallback: ComponentCallback = resetForm;

	async function submitForm(): Promise<void> {
		try {
			const rentalId =
				selectedService === 'Luggage'
					? `L${Date.now().toString().slice(-8)}`
					: `R${Date.now().toString().slice(-8)}`;

			const submissionData: SubmissionData = {
				rentalID: rentalId,
				status: 'Pending',
				submittedAt: new Date().toISOString(),
				...formData,
				expectedReturn: calculateExpectedReturn()
			};

			// Optimistic UI Update for instant feedback
			formData.rentalID = rentalId;
			submitted = true;

			// Submit to backend API (SvelteKit API route)
			const response = await fetch('/api/rentals', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(submissionData)
			});

			if (!response.ok) {
				throw new Error('Submission failed');
			}
		} catch (error) {
			console.error('Submission error:', error);
			// PWA service worker would handle this for background sync
			submitted = false;
			alert(
				'申し込みに失敗しました。ネットワーク接続を確認してください。/ Submission failed. Please check network connection.'
			);
		}
	}

	function calculateExpectedReturn(): string {
		// This logic should be updated to match your latest rules
		if (selectedService === 'Bike' && formData.rentalPlan) {
			const hours = parseInt(formData.rentalPlan.replace('hours', ''));
			return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
		}
		return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
	}

	function goBack(): void {
		if (currentStep > 1) {
			currentStep--;
			// Clear selection when going back to step 1
			if (currentStep === 1) {
				selectedService = '';
				formData.serviceType = '';
			}
		}
	}

	function resetForm(): void {
		currentStep = 1;
		selectedService = '';
		formData = {
			customerName: '',
			customerContact: '',
			documentType: '',
			companion: '',
			bikeCount: 1,
			rentalPlan: '',
			totalPrice: 0,
			expectedReturn: '',
			agreement: false,
			serviceType: ''
		};
		submitted = false;
	}
</script>

<svelte:head>
	<title>Service @YIC</title>
	<meta
		name="description"
		content="Yamanouchi Information Center Service - Bike, Onsen Pass, Luggage Storage"
	/>
	<meta name="theme-color" content="#1e40af" />
	<link rel="manifest" href="/manifest.json" />
</svelte:head>

<main
	class="min-h-screen bg-cover p-4 bg-center"
	style="background-image: url('https://images.unsplash.com/photo-1739856688639-e538b9effb25?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');"
>
	<div class="mx-auto max-w-2xl">
		{#if submitted}
			<SuccessPage rentalData={formData} {isKiosk} onRestart={resetFormCallback} />
		{:else}
			<FormWrapper
				{currentStep}
				{totalSteps}
				hasSelection={selectedService !== ''}
				{selectedService}
			>
				{#if currentStep === 1}
					<Step1ServiceSelection onServiceSelected={handleServiceSelectionCallback} />
				{:else if currentStep === 2}
					{#if selectedService === 'Bike'}
						<BikeDetails
							data={formData}
							onComplete={handleDetailsCompleteCallback}
							onBack={goBackCallback}
						/>
					{:else if selectedService === 'Onsen'}
						<OnsenDetails
							data={formData}
							onComplete={handleDetailsCompleteCallback}
							onBack={goBackCallback}
						/>
					{:else if selectedService === 'Luggage'}
						<LuggageDetails
							data={formData}
							onComplete={handleDetailsCompleteCallback}
							onBack={goBackCallback}
							simplified={true}
						/>
					{/if}
				{:else if currentStep === 3}
					{#if selectedService === 'Bike'}
						<BikeAgreement
							data={formData}
							onComplete={handleAgreementCompleteCallback}
							onBack={goBackCallback}
						/>
					{:else if selectedService === 'Onsen'}
						<OnsenAgreement
							data={formData}
							onComplete={handleAgreementCompleteCallback}
							onBack={goBackCallback}
						/>
					{/if}
				{/if}
			</FormWrapper>
		{/if}
	</div>
</main>
