<script>
	import { page } from '$app/stores';
	
	const error = $page.url.searchParams.get('error');
	
	const getErrorMessage = (errorCode) => {
		switch (errorCode) {
			case 'Configuration':
				return {
					title: '設定エラー',
					message: 'OAuth設定に問題があります。',
					detail: '管理者に問い合わせてください。Google Cloud Consoleでリダイレクトリンクの設定が必要です。'
				};
			case 'AccessDenied':
				return {
					title: 'アクセスが拒否されました',
					message: '@info-yamanouchi.net のメールアドレスでログインしてください。',
					detail: 'このアプリケーションはスタッフ専用です。'
				};
			default:
				return {
					title: 'エラーが発生しました',
					message: 'ログイン処理中にエラーが発生しました。',
					detail: 'もう一度お試しください。'
				};
		}
	};
	
	const errorInfo = getErrorMessage(error);
</script>

<svelte:head>
	<title>ログインエラー - 山ノ内町観光案内所</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="flex justify-center">
			<div class="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center">
				<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.882 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
				</svg>
			</div>
		</div>
		<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
			{errorInfo.title}
		</h2>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
			<div class="space-y-6">
				<div class="bg-red-50 border border-red-200 rounded-md p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
							</svg>
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">
								{errorInfo.message}
							</h3>
							<div class="mt-2 text-sm text-red-700">
								<p>{errorInfo.detail}</p>
							</div>
						</div>
					</div>
				</div>

				{#if error === 'Configuration'}
					<div class="bg-blue-50 border border-blue-200 rounded-md p-4">
						<div class="text-sm text-blue-700">
							<strong>設定が必要:</strong><br/>
							Google Cloud Consoleで以下のリダイレクトURIを追加してください：<br/>
							<code class="bg-blue-100 px-1 rounded">http://localhost:5173/auth/callback/google</code>
						</div>
					</div>
				{/if}

				{#if error}
					<div class="bg-gray-50 border border-gray-200 rounded-md p-4">
						<div class="text-xs text-gray-500">
							<strong>エラーコード:</strong> {error}
						</div>
					</div>
				{/if}

				<div class="flex space-x-4">
					<a
						href="/admin"
						class="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						再試行
					</a>
					<a
						href="/"
						class="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						キオスクに戻る
					</a>
				</div>
			</div>
		</div>
	</div>
</div>