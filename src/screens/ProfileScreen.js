// src/screens/ProfileScreen.js

export function renderProfileScreen() {
	const mainContent = document.getElementById('mainContent')
	const tg = window.Telegram.WebApp
	const user = tg.initDataUnsafe?.user

	mainContent.innerHTML = /* html */ `
        <div class="screen profile-screen">
			<!-- Profile Header with Avatar -->
			<div class="flex flex-col items-center mb-4">
				<div class="profile-avatar-large mb-4">
					<img
						src="https://ui-avatars.com/api/?name=${user?.first_name || 'User'}+${user?.last_name || ''}&size=120&background=random"
						alt="Profile"
						class="w-full h-full object-cover rounded-full relative z-10"
					/>
					<img src="../public/images/avatar-frame-bronze.svg" alt="avatar frame" class="avatar-frame" />
				</div>
				<h2 class="heading-2xl mb-3">${user?.first_name || 'User'} ${user?.last_name || ''}</h2>
				<div class="flex items-center gap-2">
					<img src="../public/images/home-icon.svg" alt="BLC Coin" class="size-5 shrink-0" />
					<span class="heading-lg">320 322</span>
				</div>
			</div>

			<!-- Buy and Withdraw Buttons -->
			<div class="flex gap-2 mb-4" style="position: relative; z-index: 1;">
				<button id="buyBtn" class="btn btn--white--sm flex-1">Buy</button>
				<button class="btn btn--lg flex-1 withdraw-btn">Withdraw</button>
			</div>
			<!-- Level Progress Cards -->
			<div class="mb-6 glass-block">
				<!-- Current Level -->
				<div class="flex items-center justify-between gap-2 mb-3">
					<div class="flex items-center gap-1.5">
						<img src="../public/images/avatar-frame-bronze.svg" alt="level" class="size-6" />
						<span class="text-xs font-medium text-white">10 LVL</span>
					</div>
					<div class="flex items-center gap-1.5">
						<img src="../public/images/avatar-frame-silver.svg" alt="level" class="size-6" />
						<span class="text-xs font-medium text-white">10 LVL</span>
					</div>
				</div>

				<div class="w-full h-2 bg-[#1a1714] rounded-full mb-2">
					<div class="h-full golden-gradient rounded-full" style="width: 50%"></div>
				</div>
				<div class="flex items-center justify-between gap-2">
					<span class="font-medium text-xs tracking-tight text-[#d6d2d] leading">320 322</span>
					<span class="font-medium text-xs tracking-tight text-[#d6d2d]">400 500</span>
				</div>
			</div>

			<!-- BIO Section -->
			<div class="glass-block">
				<div class="flex items-center justify-between mb-3">
					<h3 class="heading-normal">BIO</h3>
					<button class="flex items-center justify-center size-7 rounded-full border-[rgba(255,_255,_255,_0.03)] hover:bg-white/10 bg-[rgba(248,_248,_248,_0.02)]">
						<svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M8.25001 4.41421L6.25001 2.41421M0.5 10.1642L2.19218 9.97619C2.39893 9.95322 2.5023 9.94174 2.59892 9.91046C2.68464 9.88271 2.76622 9.8435 2.84144 9.7939C2.92623 9.73799 2.99977 9.66444 3.14686 9.51735L9.75001 2.91421C10.3023 2.36193 10.3023 1.4665 9.75001 0.914214C9.19773 0.361929 8.3023 0.361929 7.75001 0.914213L1.14686 7.51735C0.999773 7.66444 0.926228 7.73799 0.870319 7.82277C0.820716 7.89799 0.781507 7.97957 0.753757 8.06529C0.722478 8.16191 0.710992 8.26529 0.68802 8.47203L0.5 10.1642Z"
								stroke="white"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
				</div>
				<p class="text-left text-xs text-[#d6d2d2] font-light leading-[183%]">
					Lorem ipsum dolor sit amet consectetur. Cras amet eget gravida. Sollicitudin viverra vestibulum at neque ultricies facilisis ultrices. Suscipit morbi orci turpis odio
					turpis gravida. Nisl dolor cras ac. Ultrices ullamcorper justo ultrices.
				</p>
			</div>
		</div>
    `

	// Buy button handler
	const buyBtn = document.getElementById('buyBtn')
	buyBtn.addEventListener('click', () => {
		import('./BuyScreen.js')
			.then(module => {
				module.renderBuyScreen()
			})
			.catch(err => {
				console.error('Error loading BuyScreen:', err)
			})
	})
}
