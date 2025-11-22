// src/screens/HomeScreen.js

export function renderHomeScreen() {
	const mainContent = document.getElementById('mainContent')
	mainContent.innerHTML = /* html */ `
        <div class="screen home-screen">
			<div class="flex flex-col items-center w-full gap-2 mb-2">
				<p class="flex items-center gap-2 text-white font-medium text-xs">
					<img src="../public/images/home-icon.svg" alt="BLC Coin" class="size-4 shrink-0" />
					Total balance
				</p>
				<h1 class="text-lg font-semibold text-white font-inter">320 322 <span class="text-gold">$BLC</span></h1>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[3px] md:gap-8 w-full">
				<div class="h-[210px] rounded-xl p-2 flex flex-col justify-end cursor-pointer relative overflow-hidden">
					<img src="../public/images/rank-1.svg" alt="rank 1" class="absolute left-2 top-2 size-5" />
					<img src="../public/images/covers/cover1.png" alt="cover 1" class="absolute w-full h-full left-0 top-0 object-cover" />
					<p class="w-full flex items-center justify-center gap-1 p-2 text-white font-medium text-sm backdrop-blur-sm z-10 rounded-[32px]">
						<img src="../public/images/home-icon.svg" alt="BLC Coin" class="size-4 shrink-0" />
						100
					</p>
				</div>
				<div class="h-[210px] rounded-xl p-2 flex flex-col justify-end cursor-pointer relative overflow-hidden">
					<img src="../public/images/rank-1.svg" alt="rank 1" class="absolute left-2 top-2 size-5" />
					<img src="../public/images/covers/cover2.png" alt="cover 2" class="absolute w-full h-full left-0 top-0 object-cover" />
					<p class="w-full flex items-center justify-center gap-1 p-2 text-white font-medium text-sm backdrop-blur-sm z-10 rounded-[32px]">
						<img src="../public/images/home-icon.svg" alt="BLC Coin" class="size-4 shrink-0" />
						150
					</p>
				</div>
				<div class="h-[210px] rounded-xl p-2 flex flex-col justify-end cursor-pointer relative overflow-hidden">
					<img src="../public/images/rank-1.svg" alt="rank 1" class="absolute left-2 top-2 size-5" />
					<img src="../public/images/covers/cover3.png" alt="cover 3" class="absolute w-full h-full left-0 top-0 object-cover" />
					<p class="w-full flex items-center justify-center gap-1 p-2 text-white font-medium text-sm backdrop-blur-sm z-10 rounded-[32px]">
						<img src="../public/images/home-icon.svg" alt="BLC Coin" class="size-4 shrink-0" />
						200
					</p>
				</div>
				<div class="h-[210px] rounded-xl p-2 flex flex-col justify-end cursor-pointer relative overflow-hidden">
					<img src="../public/images/rank-1.svg" alt="rank 1" class="absolute left-2 top-2 size-5" />
					<img src="../public/images/covers/cover4.png" alt="cover 4" class="absolute w-full h-full left-0 top-0 object-cover" />
					<p class="w-full flex items-center justify-center gap-1 p-2 text-white font-medium text-sm backdrop-blur-sm z-10 rounded-[32px]">
						<img src="../public/images/home-icon.svg" alt="BLC Coin" class="size-4 shrink-0" />
						250
					</p>
				</div>
				<div class="h-[210px] rounded-xl p-2 flex flex-col justify-end cursor-pointer relative overflow-hidden">
					<img src="../public/images/rank-1.svg" alt="rank 1" class="absolute left-2 top-2 size-5" />
					<img src="../public/images/covers/cover1.png" alt="cover 1" class="absolute w-full h-full left-0 top-0 object-cover" />
					<p class="w-full flex items-center justify-center gap-1 p-2 text-white font-medium text-sm backdrop-blur-sm z-10 rounded-[32px]">
						<img src="../public/images/home-icon.svg" alt="BLC Coin" class="size-4 shrink-0" />
						100
					</p>
				</div>
				<div class="h-[210px] rounded-xl p-2 flex flex-col justify-end cursor-pointer relative overflow-hidden">
					<img src="../public/images/rank-1.svg" alt="rank 1" class="absolute left-2 top-2 size-5" />
					<img src="../public/images/covers/cover2.png" alt="cover 2" class="absolute w-full h-full left-0 top-0 object-cover" />
					<p class="w-full flex items-center justify-center gap-1 p-2 text-white font-medium text-sm backdrop-blur-sm z-10 rounded-[32px]">
						<img src="../public/images/home-icon.svg" alt="BLC Coin" class="size-4 shrink-0" />
						100
					</p>
				</div>
				<div class="h-[210px] rounded-xl p-2 flex flex-col justify-end cursor-pointer relative overflow-hidden">
					<img src="../public/images/rank-1.svg" alt="rank 1" class="absolute left-2 top-2 size-5" />
					<img src="../public/images/covers/cover3.png" alt="cover 3" class="absolute w-full h-full left-0 top-0 object-cover" />
					<p class="w-full flex items-center justify-center gap-1 p-2 text-white font-medium text-sm backdrop-blur-sm z-10 rounded-[32px]">
						<img src="../public/images/home-icon.svg" alt="BLC Coin" class="size-4 shrink-0" />
						100
					</p>
				</div>
				<div class="h-[210px] rounded-xl p-2 flex flex-col justify-end cursor-pointer relative overflow-hidden">
					<img src="../public/images/rank-1.svg" alt="rank 1" class="absolute left-2 top-2 size-5" />
					<img src="../public/images/covers/cover4.png" alt="cover 4" class="absolute w-full h-full left-0 top-0 object-cover" />
					<p class="w-full flex items-center justify-center gap-1 p-2 text-white font-medium text-sm backdrop-blur-sm z-10 rounded-[32px]">
						<img src="../public/images/home-icon.svg" alt="BLC Coin" class="size-4 shrink-0" />
						100
					</p>
				</div>
			</div>
		</div>
    `

	// Add event listeners
	const buttons = mainContent.querySelectorAll('.block-btn')
	buttons.forEach(btn => {
		btn.addEventListener('click', e => {
			const blockText = e.target.closest('.block').querySelector('h3').textContent
			window.Telegram.WebApp.showAlert(`${blockText} clicked!`)
		})
	})
}
