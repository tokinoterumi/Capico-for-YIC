<script lang="ts">
	interface AgreementData {
		agreement?: boolean;
	}

	interface CompleteEvent {
		detail: {
			agreement: boolean;
		};
	}

	export let data: AgreementData;
	export let onComplete: ((event: CompleteEvent) => void) | null = null;
	export let onBack: (() => void) | null = null;

	let agreement: boolean = data.agreement || false;

	$: isValid = agreement;

	function handleNext(): void {
		if (isValid && onComplete) {
			onComplete({
				detail: {
					agreement: true
				}
			});
		}
	}
</script>

<div class="space-y-6">
	<div class="mb-8 text-center">
		<h2 class="mb-2 text-2xl font-bold text-gray-900">利用規約<br />Terms of Service</h2>
		<p class="text-gray-600">
			利用規約をお読みいただき、ご同意いただいた上でお進みください。<br />Please read and agree to
			the terms of service (English version below).
		</p>
	</div>

	<!-- Terms Content -->
	<div class="bg-white border border-gray-200 rounded-lg max-h-96 overflow-y-auto p-6">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Japanese Terms -->
			<div class="space-y-4" lang="ja">
				<h3 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
					湯田中外湯巡り手形利用規約
				</h3>
				<p class="text-sm text-gray-700 leading-relaxed">
					本規約は、一般財団法人山ノ内まちづくり観光局（以下、「観光局」という。）が実施する「湯田中外湯巡り手形」における湯田中地区内の共同浴場および駅前温泉楓の湯（以下、「対象施設」といいます）の利用に関する事項を定めるものです。利用者の皆様には、本規約を遵守し、対象施設を適切にご利用いただきますようお願いいたします。
				</p>

				<div class="space-y-4 text-sm text-gray-700">
					<div>
						<h4 class="font-semibold text-gray-900 mb-2">１. 免責事項・注意事項</h4>
						<ol class="space-y-2 ml-4">
							<li>
								1.
								対象施設内での事故や怪我、貴重品などの盗難、紛失については、当観光局では一切の責任を負いかねます。
							</li>
							<li>
								2.
								利用者のマナー違反や迷惑行為等、本規約に違反した場合、観光局の判断により、手形の利用を中止またはお断りする場合があります。その場合の返金はいたしません。
							</li>
							<li>3. 実証実験期間中であり、事業内容や本規約は予告なく変更される場合があります。</li>
						</ol>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 mb-2">２. 手形について</h4>
						<ol class="space-y-2 ml-4">
							<li>（1）手形購入時に、身分証明書の提示と申込書の記載をお願いいたします。</li>
							<li>
								（2）手形購入時、共同浴場利用のための鍵、パンフレット、ゴミ持ち帰袋と湯かご一式を貸与いたします。
							</li>
							<li>（3）駅前温泉楓の湯を利用する際は、窓口で手形を提示し、押印を受けてください。</li>
							<li>
								（4）利用後は、営業時間内（17:30まで）に必ず鍵を山ノ内インフォメーションセンターにご返却ください。17:30を過ぎても返却がない場合は電話連絡を行う場合がございます。
							</li>
							<li class="text-red-600">
								（5）申請人数以上の利用や鍵の未返却及び紛失した場合には金3万円をいただきます。
							</li>
						</ol>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 mb-2">３. 対象施設の利用について</h4>
						<div class="ml-4">
							<p class="font-medium mb-2">（1）利用時間</p>
							<div class="ml-4 space-y-1">
								<p><strong>共同浴場（湯田中大湯、綿の湯、脚気の湯）: 10:00～17:00</strong></p>
								<p><strong>楓の湯: 10:00～20:30</strong>（入浴は21:00まで）</p>
							</div>
						</div>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 mb-2">４. 利用マナー・ルール</h4>
						<ol class="space-y-2 ml-4">
							<li>
								（1）共同浴場は地域住民の生活の一部であり、大切に維持管理されています。皆様に気持ちよくご利用いただくため、以下のマナーを遵守してください。
							</li>
							<li>（2）入浴前にかけ湯をしてください。</li>
							<li>（3）お湯を水で埋めすぎたり、水を出しっぱなしにしないでください。</li>
							<li>
								（4）浴場内にゴミを置かないでください。お渡ししたゴミ持ち帰り袋に入れ、山ノ内インフォメーションセンターにご返却ください。
							</li>
							<li>（5）浴場内での飲食・飲酒はご遠慮ください。</li>
							<li>（6）大きな声で話す、騒ぐなど、他の利用者の迷惑となる行為はしないでください。</li>
						</ol>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 mb-2">５. 禁止事項</h4>
						<p class="mb-2">以下の行為は固く禁じます。</p>
						<ol class="space-y-2 ml-4">
							<li>（1）購入した手形を第三者に転売、譲渡する行為。</li>
							<li>（2）申請した人数を超えて共同浴場を利用する行為。</li>
							<li>（3）対象施設の設備や備品を破損させる行為。</li>
							<li>（4）浴場内を撮影する行為及び盗撮行為。</li>
							<li>（5）浴場内での排泄行為。</li>
							<li>（6）本規約または各共同浴場の利用ルールに違反する行為。</li>
							<li>（7）その他、観光局または対象施設の管理者、地域住民の迷惑となる行為。</li>
						</ol>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 mb-2">６. 子供の利用について</h4>
						<ol class="space-y-2 ml-4">
							<li>
								（1）7歳以上のお子さんは混浴が出来ません。男子は男湯に女子は女湯のご利用をお願いいたします。
							</li>
							<li>
								（2）6歳以下は無料となりますが、保護者同伴での入浴が必須となりますのでご了承ください。
							</li>
						</ol>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 mb-2">７. 個人情報について</h4>
						<p class="ml-4">
							本事業で知り得た個人情報は、本事業以外には使用しません。また、ご本人の同意なしに第三者に提供することもございません。
						</p>
					</div>
				</div>
			</div>

			<!-- English Terms -->
			<div class="space-y-4" lang="en">
				<h3 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
					Yamanouchi Bathhouse Voucher Terms of Service
				</h3>
				<p class="text-sm text-gray-700 leading-relaxed">
					The following agreement outlines the terms and conditions of the use of selected
					bathhouses in the Yudanaka area, including Kaede no Yu (henceforth referred to as Select
					Facilities), as provided by the Yamanouchi Tourism Bureau (henceforth referred to as the
					Tourism Bureau) by the issuing of the Yamanouchi Bathhouse Voucher. We ask that all users
					comply with these terms and conditions and use the Select Facilities appropriately.
				</p>

				<div class="space-y-4 text-sm text-gray-700">
					<div>
						<h4 class="font-semibold text-gray-900 mb-2">1. Disclaimers and precautions</h4>
						<ol class="space-y-2 ml-4">
							<li>
								1. The Tourism Bureau cannot be held responsible for any accidents, injuries, theft
								or loss of valuables or other items while on the premises of the Selected
								Facilities.
							</li>
							<li>
								2. The Tourism Bureau reserves the right to suspend or refuse the use of vouchers in
								the event of violations of this agreement, including but not limited to violations
								of user etiquette or disruptive behavior. In such cases, no refunds will be made.
							</li>
							<li>
								3. The development of this service is still in progress, and as such the contents
								and terms and conditions are subject to change without notice.
							</li>
						</ol>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 mb-2">
							2. Regarding the Yamanouchi Public Bath Voucher
						</h4>
						<ol class="space-y-2 ml-4">
							<li>
								(1) The presentation of personal identification and completion of an application
								form will be required at the time of Voucher purchase.
							</li>
							<li>
								(2) Issued at the time of Voucher purchase will be a set of keys for using public
								bathhouses, a pamphlet, a garbage bag, and a basket for user belongings.
							</li>
							<li>
								(3) When using the Kaede no Yu hot spring in front of the station, please present
								your Voucher at the counter and have it stamped.
							</li>
							<li>
								(4) Keys are to be returned to the Yamanouchi Information Center no later than
								17:30PM. If not returned by 17:30PM we may contact you by phone.
							</li>
							<li class="text-red-600">
								(5) 30,000 yen will be charged in the event of use of this service by those other
								than designated applicants, or of failure to return keys.
							</li>
						</ol>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 mb-2">3. Hours of Operation</h4>
						<div class="ml-4 space-y-1">
							<p>
								<strong
									>Public Baths (Yudanaka Ooyu, Wata no Yu, Kakke no Yu): 10:00a.m～5:00p.m</strong
								>
							</p>
							<p><strong>Kaede no Yu: 10:00a.m～9:00p.m</strong> (Entry cutoff at 8:30p.m)</p>
						</div>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 mb-2">4. Bathhouse Rules and Manners</h4>
						<ol class="space-y-2 ml-4">
							<li>
								(1) Public bathhouses are part of the daily lives of local residents and are
								carefully maintained. In order to ensure that everyone can use the bathhouses in a
								pleasant manner, please observe the following rules.
							</li>
							<li>(2) Please wash yourself before entering the bath.</li>
							<li>
								(3) Please do not excessively dilute the spring water with tap water, or leave the
								tap running.
							</li>
							<li>
								(4) Please do not litter in the bathhouse. Garbage can be brought back to the
								Yamanouchi Information Center in provided garbage bags.
							</li>
							<li>(5) Please do not eat or drink in the bathhouse.</li>
							<li>
								(6) Please avoid any behavior that may bother other users, such as loud talking or
								horseplay.
							</li>
						</ol>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 mb-2">5. Prohibitions</h4>
						<p class="mb-2">The following are strictly prohibited.</p>
						<ol class="space-y-2 ml-4">
							<li>1. Resale or transfer of Vouchers to a third party</li>
							<li>2. The use of this service by those other than paying Applicants</li>
							<li>3. Damage or destruction of Select Facility property</li>
							<li>4. Filming within bathhouse</li>
							<li>5. Defecation in the bathhouse</li>
							<li>6. Violation of this agreement or rules of each individual Bathhouse</li>
							<li>
								7. Other actions that may cause inconvenience to the Tourism Bureau, the management
								of the subject facility, or local residents
							</li>
						</ol>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 mb-2">6. Regarding use by children</h4>
						<ol class="space-y-2 ml-4">
							<li>1. Children above the age of 7 may not enter the bath of the opposite sex.</li>
							<li>
								2. Children under 6 years old may enter free of charge, but must be accompanied, in
								the same bath, by a parent or guardian.
							</li>
						</ol>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 mb-2">7. Regarding personal information</h4>
						<p class="ml-4">
							Personal information obtained through this service will not be used for any purpose
							other than this service, nor will it be provided to any third party without the
							consent of the user.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Agreement Checkbox -->
	<div class="p-3">
		<label class="flex items-start space-x-3 cursor-pointer">
			<input type="checkbox" bind:checked={agreement} class="form-checkbox mt-1" required />
			<div class="text-base">
				<p class="font-medium text-gray-900">上記規約に同意します</p>
				<p class="text-gray-600">I agree to the above terms</p>
			</div>
		</label>
	</div>

	<!-- Important Safety Notice -->
	<div class="rounded-lg p-4 border">
		<div class="flex items-start">
			<div class="text-cyan-600 mr-3 mt-0.5">
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="text-base">
				<h4 class="font-semibold text-cyan-900 mb-1">重要事項</h4>
				<h4 class="font-semibold text-cyan-900 mb-1">Important Information</h4>
				<ul class="text-cyan-800 space-y-1">
					<li>
						鍵は17:30までに必ず返却してください。<br
						/>7歳以上のお子さんは混浴が出来ません。男子は男湯に女子は女湯のご利用をお願いいたします。<br
						/>マナーを守って気持ちよく大切に使いましょう。
					</li>
					<li>
						All keys must be returned by 5:30 PM. <br /> bathing is not permitted for children aged
						7 and older. Boys must use the men's bath, and girls must use the women's bath.<br /> Please
						be considerate of others and help us keep the baths clean for everyone to enjoy.
					</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Navigation Buttons -->
	<div class="flex justify-between pt-6">
		<button type="button" on:click={onBack} class="btn-secondary"> ← 戻る<br />Back </button>
		<button
			type="button"
			on:click={handleNext}
			disabled={!isValid}
			class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
		>
			申し込み完了<br />Complete Registration →
		</button>
	</div>
</div>
