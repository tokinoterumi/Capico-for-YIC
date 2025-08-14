<script>
	export let onServiceSelected;

	function selectService(service) {
		if (onServiceSelected) {
			onServiceSelected({ detail: { service } });
		}
	}
</script>

<div class="space-y-6">
	<!-- Header Section -->
	<div class="text-center space-y-2">
		<h2 class="text-xl sm:text-2xl font-bold text-slate-800">旅のスタイルを選びましょう</h2>
		<p class="text-slate-800">Choose how you want to experience Yamanouchi.</p>
	</div>

	<!-- Service Options Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
		<!-- Bike Rental -->
		<button
			on:click={() => selectService('Bike')}
			class="group relative block aspect-[5/2] sm:aspect-[3/4] w-full overflow-hidden rounded-lg sm:rounded-xl shadow-lg transition-all duration-300 hover:shadow-glow-bike hover:-translate-y-2 border border-service-bike/20 hover:border-service-bike/50"
		>
			<div
				class="absolute inset-0 bg-gradient-to-b from-service-bike/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
			></div>
			<div
				class="relative h-full flex flex-row sm:flex-col items-center justify-center p-3 sm:p-4 md:p-6 space-x-3 space-y-0 sm:space-x-0 sm:space-y-3 md:space-y-4"
			>
				<div
					class="text-2xl sm:text-4xl md:text-5xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0"
				>
					🚲
				</div>
				<div class="text-center space-y-1">
					<div class="text-sm sm:text-base md:text-lg font-semibold text-slate-800">
						レンタサイクル
					</div>
					<div class="text-sm sm:text-sm text-slate-800">Bike Rental</div>
				</div>
			</div>
		</button>

		<!-- Onsen Pass -->
		<button
			on:click={() => selectService('Onsen')}
			class="group relative block aspect-[5/2] sm:aspect-[3/4] w-full overflow-hidden rounded-lg sm:rounded-xl shadow-lg transition-all duration-300 hover:shadow-glow-onsen hover:-translate-y-2 border border-brand-primary/20 hover:border-brand-primary/50"
		>
			<div
				class="absolute inset-0 bg-gradient-to-b from-brand-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
			></div>
			<div
				class="relative h-full flex flex-row sm:flex-col items-center justify-center p-3 sm:p-4 md:p-6 space-x-3 space-y-0 sm:space-x-0 sm:space-y-3 md:space-y-4"
			>
				<div
					class="text-2xl sm:text-4xl md:text-5xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0"
				>
					♨️
				</div>
				<div class="text-center space-y-1">
					<div class="text-sm sm:text-base md:text-lg font-semibold text-slate-800">
						湯田中外湯めぐり手形
					</div>
					<div class="text-sm sm:text-sm text-slate-800">Yudanaka Onsen Tour Pass</div>
				</div>
			</div>
		</button>

		<!-- Luggage Storage -->
		<button
			on:click={() => selectService('Luggage')}
			class="group relative block aspect-[5/2] sm:aspect-[3/4] w-full overflow-hidden rounded-lg sm:rounded-xl shadow-lg transition-all duration-300 hover:shadow-glow-luggage hover:-translate-y-2 border border-service-luggage/20 hover:border-service-luggage/50"
		>
			<div
				class="absolute inset-0 bg-gradient-to-b from-service-luggage/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
			></div>
			<div
				class="relative h-full flex flex-row sm:flex-col items-center justify-center p-3 sm:p-4 md:p-6 space-x-3 space-y-0 sm:space-x-0 sm:space-y-3 md:space-y-4"
			>
				<div
					class="text-2xl sm:text-4xl md:text-5xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0"
				>
					🧳
				</div>
				<div class="text-center space-y-1">
					<div class="text-sm sm:text-base md:text-lg font-semibold text-slate-800">
						荷物お預かり
					</div>
					<div class="text-sm sm:text-sm text-slate-800">Luggage Storage</div>
				</div>
			</div>
		</button>
	</div>
</div>
