// src/screens/ReferralScreen.js (now ReferralScreen)

export function renderReferralScreen() {
	const mainContent = document.getElementById('mainContent')
	const tg = window.Telegram.WebApp
	const userId = tg.initDataUnsafe?.user?.id || '123456'
	const referralLink = `https://t.me/chuvashTokenDev_bot/BLC_Market?start=${userId}`

	mainContent.innerHTML = /* html */ `
        <div class="screen referral-screen mb-14">
			<!-- Header -->
			<div class="flex flex-col items-center gap-2 mb-6">
				<h2 class="text-2xl font-bold">Invite friends</h2>
				<p class="text-14 text-gray-400">You and your friend will get bonuses</p>
			</div>

			<!-- Referral Blocks -->
			<div class="flex flex-col gap-3 mb-6">
				<div class="glass-block flex flex-col gap-2">
					<div class="flex items-center gap-2">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<circle cx="12" cy="6" r="4" stroke="white" />
							<circle cx="17" cy="18" r="4" stroke="white" />
							<path d="M17 16.667V19.3337" stroke="white" stroke-linecap="round" stroke-linejoin="round" />
							<path d="M15.666 18L18.3327 18" stroke="white" stroke-linecap="round" stroke-linejoin="round" />
							<path d="M14 20.8344C13.3663 20.9421 12.695 21 12 21C8.13401 21 5 19.2091 5 17C5 14.7909 8.13401 13 12 13C13.7135 13 15.2832 13.3518 16.5 13.9359" stroke="white" />
						</svg>

						<p class="heading-sm">To invite a friend</p>
					</div>
					<p class="text-12">Bonuses for referring a friend - 500 tokens</p>
				</div>

				<div class="glass-block flex flex-col gap-2">
					<div class="flex items-center gap-2">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<circle cx="9" cy="6" r="4" stroke="white" stroke-width="1.5" />
							<path d="M15 9C16.6569 9 18 7.65685 18 6C18 4.34315 16.6569 3 15 3" stroke="white" stroke-width="1.5" stroke-linecap="round" />
							<ellipse cx="9" cy="17" rx="7" ry="4" stroke="white" stroke-width="1.5" />
							<path d="M18 14C19.7542 14.3847 21 15.3589 21 16.5C21 17.5293 19.9863 18.4229 18.5 18.8704" stroke="white" stroke-width="1.5" stroke-linecap="round" />
						</svg>
						<p class="heading-sm">Have a friend bring a friend</p>
					</div>
					<p class="text-12">Bonuses for referring a friend - 500 tokens</p>
				</div>
			</div>

			<!-- Friends List -->
			<div class="mb-6">
				<h3 class="heading-normal mb-3">Your list of friends (4)</h3>
				<div class="flex flex-col gap-2 glass-block">
					<div class="flex items-center justify-between mb-4 pb-4 border-b border-[rgba(71,_71,_71,_0.3);]">
						<div class="flex items-center gap-2">
							<img src="../public/images/temp/friend1.png" alt="Carlynne Ristow" class="size-8 rounded-full flex-shrink-0" />
							<p class="heading-sm">Carlynne Ristow</p>
						</div>
						<div class="flex items-center gap-2">
							<img src="../public/images/home-icon.svg" alt="BLC Icon" class="size-4 flex-shrink-0" />
							<span class="text-12 font-semibold">23,434 <span class="text-gold text-[0.6875rem]">$BLC</span></span>
						</div>
					</div>
					<div class="flex items-center justify-between mb-4 pb-4 border-b border-[rgba(71,_71,_71,_0.3);]">
						<div class="flex items-center gap-2">
							<img src="../public/images/temp/friend2.png" alt="Dimitris Hultberg" class="size-8 rounded-full flex-shrink-0" />
							<p class="heading-sm">Dimitris Hultberg</p>
						</div>
						<div class="flex items-center gap-2">
							<img src="../public/images/home-icon.svg" alt="BLC Icon" class="size-4 flex-shrink-0" />
							<span class="text-12 font-semibold">23,434 <span class="text-gold text-[0.6875rem]">$BLC</span></span>
						</div>
					</div>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<img src="../public/images/temp/friend3.png" alt="Francesco Streich" class="size-8 rounded-full flex-shrink-0" />
							<p class="heading-sm">Francesco Streich</p>
						</div>
						<div class="flex items-center gap-2">
							<img src="../public/images/home-icon.svg" alt="BLC Icon" class="size-4 flex-shrink-0" />
							<span class="text-12 font-semibold">23,434 <span class="text-gold text-[0.6875rem]">$BLC</span></span>
						</div>
					</div>
				</div>
			</div>

			<!-- Invite Button -->
			<div class="fixed bottom-[105px] left-0 right-0 px-4 border-t border-[#474747] bg-[#201915] py-3">
				<div class="flex gap-2">
					<button id="inviteBtn" class="flex-1 bg-white text-black font-semibold py-4 rounded-[46px] flex items-center justify-center gap-1">
						<span>Invite Friend</span>
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M12.0752 14.5834H13.3335C15.8502 14.5834 17.9169 12.525 17.9169 10C17.9169 7.48335 15.8585 5.41669 13.3335 5.41669H12.0752"
								stroke="#171614"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<path
								d="M7.08333 5.41669H5.83333C3.30833 5.41669 1.25 7.47502 1.25 10C1.25 12.5167 3.30833 14.5834 5.83333 14.5834H7.08333"
								stroke="#171614"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<path d="M6.25 10H12.9167" stroke="#171614" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
					<button id="copyLinkBtn" class="bg-white text-black p-4 rounded-3xl">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M13.3337 13.3334V15.6667C13.3337 16.6001 13.3337 17.0668 13.152 17.4233C12.9922 17.7369 12.7372 17.9919 12.4236 18.1517C12.0671 18.3334 11.6004 18.3334 10.667 18.3334H4.33366C3.40024 18.3334 2.93353 18.3334 2.57701 18.1517C2.2634 17.9919 2.00844 17.7369 1.84865 17.4233C1.66699 17.0668 1.66699 16.6001 1.66699 15.6667V9.33335C1.66699 8.39993 1.66699 7.93322 1.84865 7.5767C2.00844 7.2631 2.2634 7.00813 2.57701 6.84834C2.93353 6.66669 3.40024 6.66669 4.33366 6.66669H6.66699M9.33366 13.3334H15.667C16.6004 13.3334 17.0671 13.3334 17.4236 13.1517C17.7372 12.9919 17.9922 12.7369 18.152 12.4233C18.3337 12.0668 18.3337 11.6001 18.3337 10.6667V4.33335C18.3337 3.39993 18.3337 2.93322 18.152 2.5767C17.9922 2.2631 17.7372 2.00813 17.4236 1.84834C17.0671 1.66669 16.6004 1.66669 15.667 1.66669H9.33366C8.40024 1.66669 7.93353 1.66669 7.57701 1.84834C7.2634 2.00813 7.00844 2.2631 6.84865 2.5767C6.66699 2.93322 6.66699 3.39993 6.66699 4.33335V10.6667C6.66699 11.6001 6.66699 12.0668 6.84865 12.4233C7.00844 12.7369 7.2634 12.9919 7.57701 13.1517C7.93353 13.3334 8.40024 13.3334 9.33366 13.3334Z"
								stroke="#171614"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
    `

	// Invite functionality
	const inviteBtn = document.getElementById('inviteBtn')
	const copyLinkBtn = document.getElementById('copyLinkBtn')

	inviteBtn.addEventListener('click', () => {
		const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join me on this awesome app!')}`
		window.open(shareUrl, '_blank')
	})

	copyLinkBtn.addEventListener('click', () => {
		navigator.clipboard.writeText(referralLink)
		tg.showAlert('Link copied to clipboard!')
	})
}
