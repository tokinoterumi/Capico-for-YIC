<script>
	export let data;
	/** @type {((event: { detail: { agreement: boolean } }) => void) | null} */
	export let onComplete = null;
	export let onBack = null;

	let agreement = data.agreement || false;

	$: isValid = agreement;

	function handleNext() {
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
					レンタサイクル利用規約
				</h3>
				<p class="text-sm text-gray-700 leading-relaxed">
					この利用規約は、山ノ内まちづくり観光局（以下
					観光局）が運営管理するレンタサイクルについて、お客様（以下
					利用者）に遵守していただく事項について規定しています。利用者は、この利用規約に同意の上、レンタサイクルを利用していただくことになります。
				</p>

				<ol class="space-y-3 text-sm text-gray-700">
					<li>
						<strong class="text-gray-900">1. 利用申し込み</strong>
						<p class="mt-1 leading-relaxed">
							利用申込みは、下記のいずれかの方法で行うことができます。<br />
							（1）電話予約（原則ご利用日前日まで）<br />
							（2）窓口での申込み<br /><br />
							利用申込書に必要事項を記入のうえ、身分を証明できるもの（運転免許証、パスポートなど顔写真があるもの）を提示してください。提示いただいた身分証明証は写真を撮らせて頂きます。利用申込書の代表者は18歳以上の成人の方に限らせていただきます。
						</p>
					</li>

					<li>
						<strong class="text-gray-900">2. 利用時間</strong>
						<p class="mt-1 leading-relaxed">
							貸出・返却ともに当日9時～17時、または10時～17時までとします（営業時間により貸出時間が変わります）。利用時間を過ぎる場合、必ず山ノ内インフォメーションセンターへご連絡ください。
						</p>
					</li>

					<li>
						<strong class="text-gray-900">3. 貸出及び返却場所</strong>
						<p class="mt-1 leading-relaxed">
							貸出・返却ともに山ノ内インフォメーションセンターへお願いします。乗り捨てすることはできません。
						</p>
					</li>

					<li>
						<strong class="text-gray-900">4. 利用料金</strong>
						<p class="mt-1 leading-relaxed">
							利用料金は、2時間2,000円、3時間2,500円、4時間3,000円、1日4,000円とします。<br />
							※返却時間を超えても返却されない場合、遅延料金をいただきます（30分毎500円）
						</p>
					</li>

					<li>
						<strong class="text-gray-900">5. 利用条件</strong>
						<p class="mt-1 leading-relaxed">身長150㎝未満のお客様はご利用いただけません。</p>
					</li>

					<li>
						<strong class="text-gray-900">6. 自転車の故障</strong>
						<p class="mt-1 leading-relaxed">
							利用者に起因する自転車の故障については、利用者の費用負担で修理していただきます。故障した場合は山ノ内インフォメーションセンターまでご連絡ください。
						</p>
					</li>

					<li>
						<strong class="text-gray-900">7. 自転車の盗難</strong>
						<p class="mt-1 leading-relaxed">
							ご利用期間中に自転車から離れる場合は、必ず自転車の鍵を施錠してください。利用期間中に自転車の盗難・紛失等に遭遇した場合は、速やかに山ノ内インフォメーションセンターまで連絡してください。無施錠放置等、利用者に起因する事情により、盗難、紛失した場合は、損害賠償を請求する場合があります。
						</p>
					</li>

					<li>
						<strong class="text-gray-900">8. 事故</strong>
						<p class="mt-1 leading-relaxed">
							利用者の自転車の操作誤り等で歩行者等、第三者の身体・物に損害を与えた場合、山ノ内インフォメーションセンターで賠償を負うものとします。（1台につき１億円まで。その金額を超過した場合は利用者負担となります。）利用者が利用期間中に事故にあった場合は、速やかに警察署に届ける等の法令で定められた処置をとるとともに、山ノ内インフォメーションセンターに事故発生の日時・場所・原因・事故の状況等を報告して下さい。
						</p>
					</li>

					<li>
						<strong class="text-gray-900">9. 禁止事項</strong>
						<p class="mt-1 leading-relaxed">利用者は次の行為をしないでください。</p>
						<div class="ml-4 space-y-1">
							<p>（1）飲酒・無謀運転、その他交通法規に違反する行為</p>
							<p>（2）危険箇所・その他不適切な場所での利用</p>
							<p>（3）自転車放置禁止区域内及び歩行者や自転車の通行障害となるような場所での駐輪</p>
							<p>（4）自転車の改造</p>
							<p>（5）運転中に当該自転車の異常（パンク等）を認めた場合、運転を継続する行為</p>
							<p>（6）利用申込者以外の者に使用させること</p>
						</div>
					</li>

					<li>
						<strong class="text-gray-900">10. 規約等の変更</strong>
						<p class="mt-1 leading-relaxed">
							当規約・営業時間・サービス内容等は予告なく変更されることがありますのでご了承ください。
						</p>
					</li>
				</ol>
			</div>

			<!-- English Terms -->
			<div class="space-y-4" lang="en">
				<h3 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
					Terms of Use of Rental Bicycles
				</h3>
				<p class="text-sm text-gray-700 leading-relaxed">
					These terms of use stipulate the conditions to be observed by customers (hereinafter
					referred to as "users") of the rental bicycles operated and managed by the Yamanouchi
					Community Development and Tourism Bureau (hereinafter referred to as "organization").
					Users are requested to use the rental bicycles upon agreeing to these Terms of Use.
				</p>

				<ol class="space-y-3 text-sm text-gray-700">
					<li>
						<strong class="text-gray-900">1. Reservation Requests</strong>
						<p class="mt-1 leading-relaxed">
							Reservations can be made by either of the following methods:<br />
							(1) By phone (in principle, by the day before the date of use)<br />
							(2) At the Yamanouchi Information Center counter<br /><br />
							Fill out the reservation form and present a photo ID (driver's license, passport, etc.).
							The ID presented will be photographed. The representative on the reservation form must
							be an adult 18 years of age or older.
						</p>
					</li>

					<li>
						<strong class="text-gray-900">2. Hours of Use</strong>
						<p class="mt-1 leading-relaxed">
							Hours of use are from 9am to 5pm or 10am to 5pm of the same day (rental times will
							depend on the hours of operation of the information center). In the event that you
							miss the specified time, please be sure to contact the Yamanouchi Information Center.
						</p>
					</li>

					<li>
						<strong class="text-gray-900">3. Renting and return locations</strong>
						<p class="mt-1 leading-relaxed">
							Rental and return of bicycles must be made at the Yamanouchi Information Center. No
							roadside drop-offs are allowed.
						</p>
					</li>

					<li>
						<strong class="text-gray-900">4. Usage Fees</strong>
						<p class="mt-1 leading-relaxed">
							Fees are 2,000 yen for 2 hours, 2,500 yen for 3 hours, 3,000 yen for 4 hours, and
							4,000 yen for a day.<br />
							*A late fee will be charged if the bicycle is not returned after the designated return
							time (500 yen per 30 minutes).
						</p>
					</li>

					<li>
						<strong class="text-gray-900">5. Conditions of Use</strong>
						<p class="mt-1 leading-relaxed">Limited to customers above 150cm in height (4'9").</p>
					</li>

					<li>
						<strong class="text-gray-900">6. Damages to bicycles</strong>
						<p class="mt-1 leading-relaxed">
							Any damage to the bicycle caused by the user must be repaired at the user's expense.
							Please contact the Yamanouchi Information Center in the event of bicycle trouble.
						</p>
					</li>

					<li>
						<strong class="text-gray-900">7. Bicycle Theft</strong>
						<p class="mt-1 leading-relaxed">
							Please be sure to lock your bicycle when you leave your bicycle during the period of
							use. If you encounter any theft or loss of bicycles during the period of use, please
							contact the Yamanouchi Information Center right away. If a bicycle is stolen or lost
							due to circumstances attributable to the user, such as being left unlocked, you may be
							charged for the loss or theft.
						</p>
					</li>

					<li>
						<strong class="text-gray-900">8. Accidents</strong>
						<p class="mt-1 leading-relaxed">
							If a user causes damage to a third party's body or property, such as pedestrians, due
							to improper operation of the bicycle, etc., the Yamanouchi Information Center shall be
							liable for compensation. (Up to 100 million yen per bicycle. Any amount exceeding that
							amount shall be borne by the user.) If a user is involved in an accident during the
							period of use, the user shall promptly report the accident to the police station or
							take other measures required by law. In addition, the date, time, location, cause, and
							circumstances of the accident must be reported to the Yamanouchi Information Center.
						</p>
					</li>

					<li>
						<strong class="text-gray-900">9. Prohibited Acts</strong>
						<p class="mt-1 leading-relaxed">Users are prohibited from the following acts:</p>
						<div class="ml-4 space-y-1">
							<p>
								(1) Drinking alcohol and riding, reckless driving, or other acts that violate
								traffic laws
							</p>
							<p>(2) Use of bicycle in dangerous areas or other inappropriate places</p>
							<p>
								(3) Parking bicycles in areas where it is prohibited to leave bicycles unattended or
								in locations that obstruct pedestrian or bicycle traffic
							</p>
							<p>(4) Modification of the bicycle</p>
							<p>(5) Riding bicycle when it is deemed to have a problem (such as a flat tire)</p>
							<p>(6) Allowing anyone other than the applicant to use the bicycle</p>
						</div>
					</li>

					<li>
						<strong class="text-gray-900">10. Revision of Terms of Use</strong>
						<p class="mt-1 leading-relaxed">
							Please note that these terms, business hours, service details, etc. are subject to
							change without notice.
						</p>
					</li>
				</ol>
			</div>
		</div>
	</div>

	<!-- Agreement Checkbox -->
	<div class="p-2">
		<label class="flex items-start space-x-3 cursor-pointer">
			<input type="checkbox" bind:checked={agreement} class="form-checkbox mt-1" required />
			<div class="text-sm">
				<p class="font-medium text-gray-900">上記規約に同意します</p>
				<p class="text-gray-600">I agree to the above terms</p>
			</div>
		</label>
	</div>

	<!-- Important Safety Notice -->
	<div class="rounded-lg p-4 border border-red-800">
		<div class="flex items-start">
			<div class="text-red-800 mr-3 mt-0.5">
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="text-sm">
				<h4 class="font-semibold text-red-800 mb-1">
					安全に関する重要事項<br />Important Safety Information
				</h4>
				<ul class="text-red-700 space-y-1">
					<li>
						身長150cm未満の方はご利用いただけません。<br
						/>ヘルメットの着用のご協力お願いいたします。<br
						/>交通ルールを守って安全運転してください。<br />事故や故障の際は速やかにご連絡ください。
					</li>

					Height restriction: 150cm minimum. Wear helmet.Follow traffic rules and ride
					safely.Contact us immediately in case of accident or breakdown
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
