<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';

	export let onCountUpdate: ((event: { detail: { count: number } }) => void) | null = null;

	export function refreshNow() {
		loadStaff(false);
	}

	interface StaffMember {
		id: string;
		name: string;
		lastUpdated: string;
		order?: number;
	}

	let staff: StaffMember[] = [];
	let loading = true;
	let error: string | null = null;
	let showAddModal = false;
	let editingStaff: StaffMember | null = null;
	let isExpanded = false;
	let dragDisabled = true;

	onMount(() => {
		loadStaff();
	});

	async function loadStaff(showLoading = true) {
		if (!browser) return;

		if (showLoading) loading = true;
		error = null;

		try {
			const response = await fetch('/api/staff');

			if (!response.ok) {
				throw new Error('Failed to fetch staff data');
			}

			const data = await response.json();
			staff = (data.staff || [])
				.map((member, index) => ({
					...member,
					order: member.order ?? index
				}))
				.sort((a, b) => a.order - b.order);
		} catch (err) {
			console.error('Error loading staff:', err);
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	async function addStaff(name: string) {
		try {
			const response = await fetch('/api/staff', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});

			if (response.ok) {
				await loadStaff(false);
				showAddModal = false;
			} else {
				const errorData = await response.json();
				alert(`エラー: ${errorData.message}`);
			}
		} catch (err) {
			console.error('Add staff error:', err);
			alert('スタッフ追加中にエラーが発生しました');
		}
	}

	async function updateStaff(staffData: StaffMember) {
		try {
			const response = await fetch('/api/staff', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(staffData)
			});

			if (response.ok) {
				await loadStaff(false);
				editingStaff = null;
			} else {
				const errorData = await response.json();
				alert(`エラー: ${errorData.message}`);
			}
		} catch (err) {
			console.error('Update staff error:', err);
			alert('スタッフ更新中にエラーが発生しました');
		}
	}

	async function deleteStaff(staffId: string) {
		if (!confirm('このスタッフを削除しますか？')) return;

		try {
			const response = await fetch(`/api/staff?id=${staffId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				await loadStaff(false);
			} else {
				const errorData = await response.json();
				alert(`エラー: ${errorData.message}`);
			}
		} catch (err) {
			console.error('Delete staff error:', err);
			alert('スタッフ削除中にエラーが発生しました');
		}
	}

	function handleDndConsider(e) {
		staff = e.detail.items;
	}

	function handleDndFinalize(e) {
		staff = e.detail.items;
		saveStaffOrder();
	}

	async function saveStaffOrder() {
		try {
			const orderedStaff = staff.map((member, index) => ({
				...member,
				order: index
			}));

			const response = await fetch('/api/staff', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ orderedStaff })
			});

			if (!response.ok) {
				console.error('Failed to save staff order');
			}
		} catch (err) {
			console.error('Error saving staff order:', err);
		}
	}
</script>

<div class="h-full flex flex-col">
	<!-- Accordion Header -->
	<div class="flex items-center justify-between w-full mb-4">
		<button
			on:click={() => (isExpanded = !isExpanded)}
			class="flex items-center space-x-2 flex-1 text-left hover:bg-gray-100 p-2 -m-2 rounded transition-colors duration-200"
		>
			<div class="flex items-center justify-between w-full">
				<h2 class="text-lg font-semibold text-gray-900">スタッフ</h2>
				<span class="text-sm text-gray-500">Staff</span>
			</div>
			<svg
				class="w-4 h-4 text-gray-500 transition-transform duration-200 {isExpanded
					? 'rotate-180'
					: ''} ml-2"
				fill="currentColor"
				viewBox="0 0 20 20"
			>
				<path
					fill-rule="evenodd"
					d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
		<div class="flex items-center space-x-2">
			<button
				on:click={() => (dragDisabled = !dragDisabled)}
				class="p-1 {dragDisabled
					? 'text-gray-400 hover:text-gray-600'
					: 'text-green-600 hover:text-green-800'} text-sm"
				title={dragDisabled ? 'ドラッグを有効にする' : 'ドラッグを無効にする'}
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
					<path d="M10 4a2 2 0 100-4 2 2 0 000 4z" />
					<path d="M10 20a2 2 0 100-4 2 2 0 000 4z" />
					<path d="M4 12a2 2 0 100-4 2 2 0 000 4z" />
					<path d="M4 4a2 2 0 100-4 2 2 0 000 4z" />
					<path d="M4 20a2 2 0 100-4 2 2 0 000 4z" />
					<path d="M16 12a2 2 0 100-4 2 2 0 000 4z" />
					<path d="M16 4a2 2 0 100-4 2 2 0 000 4z" />
					<path d="M16 20a2 2 0 100-4 2 2 0 000 4z" />
				</svg>
			</button>
			<button
				on:click={() => (showAddModal = true)}
				class="p-1 text-blue-600 hover:text-blue-800 text-sm"
				title="スタッフ追加"
			>
				+
			</button>
			<button
				on:click={() => loadStaff()}
				class="p-1 text-gray-400 hover:text-gray-600"
				disabled={loading}
				aria-label="更新"
			>
				<svg
					class="w-4 h-4 {loading ? 'animate-spin' : ''}"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Collapsible Content -->
	{#if isExpanded}
		<div class="flex-1 overflow-y-auto transition-all duration-300">
			{#if loading && staff.length === 0}
				<div class="flex items-center justify-center py-4">
					<div class="loading-spinner"></div>
					<span class="ml-2 text-sm text-gray-500">読み込み中...</span>
				</div>
			{:else if error}
				<div class="bg-red-50 border border-red-200 rounded-lg p-3">
					<div class="flex items-center">
						<svg class="w-4 h-4 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
						<div>
							<h4 class="text-sm font-medium text-red-800">エラー</h4>
							<p class="text-xs text-red-700">{error}</p>
						</div>
					</div>
				</div>
			{:else if staff.length === 0}
				<div class="text-center py-6">
					<div
						class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2"
					>
						<svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
							<path
								d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"
							/>
						</svg>
					</div>
					<p class="text-sm text-gray-500">スタッフなし</p>
				</div>
			{:else}
				<div
					class="space-y-2"
					use:dndzone={{
						items: staff,
						dragDisabled,
						flipDurationMs: 300,
						dropTargetStyle: {}
					}}
					on:consider={handleDndConsider}
					on:finalize={handleDndFinalize}
				>
					{#each staff as member (member.id)}
						<div
							animate:flip={{ duration: 300 }}
							class="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all duration-200 {!dragDisabled
								? 'cursor-move'
								: ''}"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-2">
									{#if !dragDisabled}
										<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
											<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
											<path d="M10 4a2 2 0 100-4 2 2 0 000 4z" />
											<path d="M10 20a2 2 0 100-4 2 2 0 000 4z" />
											<path d="M4 12a2 2 0 100-4 2 2 0 000 4z" />
											<path d="M4 4a2 2 0 100-4 2 2 0 000 4z" />
											<path d="M4 20a2 2 0 100-4 2 2 0 000 4z" />
											<path d="M16 12a2 2 0 100-4 2 2 0 000 4z" />
											<path d="M16 4a2 2 0 100-4 2 2 0 000 4z" />
											<path d="M16 20a2 2 0 100-4 2 2 0 000 4z" />
										</svg>
									{/if}
									<p class="font-medium text-sm text-gray-900">{member.name}</p>
								</div>
								<div class="flex items-center space-x-1">
									<button
										on:click={() => (editingStaff = member)}
										class="p-1 text-gray-400 hover:text-blue-600"
										title="編集"
									>
										<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
											<path
												d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
											/>
										</svg>
									</button>
									<button
										on:click={() => deleteStaff(member.id)}
										class="p-1 text-gray-400 hover:text-red-600"
										title="削除"
									>
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Add Staff Modal -->
{#if showAddModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg max-w-md w-full p-6">
			<h3 class="text-lg font-semibold mb-4">スタッフ追加</h3>
			<form
				on:submit|preventDefault={(e) => {
					const formData = new FormData(e.target as HTMLFormElement);
					addStaff(formData.get('name') as string);
				}}
			>
				<div class="mb-4">
					<label class="block text-sm font-medium mb-1">名前</label>
					<input type="text" name="name" required class="w-full px-3 py-2 border rounded-lg" />
				</div>
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => (showAddModal = false)}
						class="px-4 py-2 text-gray-600 hover:text-gray-800"
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					>
						追加
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit Staff Modal -->
{#if editingStaff}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg max-w-md w-full p-6">
			<h3 class="text-lg font-semibold mb-4">スタッフ編集</h3>
			<form
				on:submit|preventDefault={(e) => {
					const formData = new FormData(e.target as HTMLFormElement);
					if (editingStaff) {
						updateStaff({
							...editingStaff,
							name: formData.get('name') as string,
							lastUpdated: new Date().toISOString()
						});
					}
				}}
			>
				<div class="mb-4">
					<label class="block text-sm font-medium mb-1">名前</label>
					<input
						type="text"
						name="name"
						value={editingStaff.name}
						required
						class="w-full px-3 py-2 border rounded-lg"
					/>
				</div>
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => (editingStaff = null)}
						class="px-4 py-2 text-gray-600 hover:text-gray-800"
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					>
						更新
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
