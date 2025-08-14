<script>
	export let currentStep;
	export let totalSteps;
	export let hasSelection = false; // Track if service has been selected
	export let selectedService = ''; // Track the selected service type

	// Calculate progress based on completed steps, not current step
	$: completedSteps = hasSelection ? currentStep - 1 : 0;
	$: progressPercentage = hasSelection ? (completedSteps / totalSteps) * 100 : 0;
</script>

<div class="rounded-2xl border border-white/30 bg-white/65 p-8 shadow-2xl backdrop-blur-xl">
	<!-- Progress Bar -->
	<div class="mb-8">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-2xl text-brand-dark">Yamanouchi Information Center Service</h1>
		</div>
		<div class="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
			<div
				class="h-2 rounded-full bg-cyan-800 transition-all duration-500"
				style="width: {progressPercentage}%"
			></div>
		</div>
	</div>

	<!-- Content Slot -->
	<div class="min-h-[400px]">
		<slot />
	</div>
</div>
