// src/screens/BuyScreen.js

export function renderBuyScreen() {
	const mainContent = document.getElementById('mainContent')
	const tg = window.Telegram.WebApp

	mainContent.innerHTML = /* html */ `
        <div class="screen buy-screen px-4 flex flex-col">
			<!-- Header with Back Button -->
			<button id="backBtn" class="flex items-center mb-2 gap-1.5 text-white hover:text-white/80 transition-colors">
				<svg xmlns="http://www.w3.org/2000/svg" class="size-3 shrink-0" fill="none" viewBox="0 0 20 20" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				<span class="text-sm font-medium">Back</span>
			</button>

			<h2 class="heading-2xl text-center mb-6">Buy BLC</h2>

			<!-- Send Section -->
			<div class="mb-6">
				<!-- Currency Select and Input -->
				<div class="glass-block p-6 mb-2">
					<div class="flex justify-between items-center mb-4">
						<label class="heading-normal">Send</label>
						<span class="text-xs text-white/50">You Send</span>
					</div>
					<div class="flex items-center justify-between mb-3">
						<!-- Custom Currency Selector -->
						<div id="currencySelector" class="flex items-center gap-2 cursor-pointer">
							<img id="selectedCurrencyIcon" src="/public/images/currencies/ton.svg" alt="TON" class="size-8" />
							<span id="selectedCurrencyText" class="heading-sm">TON</span>
							<svg xmlns="http://www.w3.org/2000/svg" class="size-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</div>

						<input type="number" id="sendAmount" class="bg-transparent border-none heading-sm text-right outline-none w-24" placeholder="1.5" value="1.5" step="0.01" />
					</div>
					<div class="flex justify-between items-center">
						<span class="text-xs text-white/70">Balance:</span>
						<span class="text-xs text-white/70" id="balance">25,837118</span>
					</div>
				</div>

				<!-- Currency Dropdown (Hidden by default) -->
				<div id="currencyDropdown" class="glass-block hidden mt-2">
					<div class="currency-option flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 rounded-lg transition-colors" data-currency="ton">
						<img src="../public/images/currencies/ton.svg" alt="TON" class="size-6" />
						<span class="text-16 font-medium text-white">TON</span>
					</div>
					<div class="currency-option flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 rounded-lg transition-colors" data-currency="usdt">
						<img src="../public/images/currencies/usdt.svg" alt="USDT" class="size-6" />
						<span class="text-16 font-medium text-white">USDT</span>
					</div>
					<div class="currency-option flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 rounded-lg transition-colors" data-currency="btc">
						<img src="/public/images/currencies/btc.svg" alt="BTC" class="size-6" />
						<span class="text-16 font-medium text-white">BTC</span>
					</div>
					<div class="currency-option flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 rounded-lg transition-colors" data-currency="eth">
						<img src="/public/images/currencies/eth.svg" alt="ETH" class="size-6" />
						<span class="text-16 font-medium text-white">ETH</span>
					</div>
				</div>
			</div>

			<!-- Receive Section -->
			<div class="mb-20">
				<!-- Receive Display -->
				<div class="glass-block p-6">
					<div class="flex justify-between items-center mb-3">
						<label class="heading-sm">Receive</label>
						<span class="text-xs text-white/50">You Receive</span>
					</div>
					<div class="flex items-center gap-2">
						<img src="/public/images/currencies/blc.svg" alt="BLC" class="size-4" />
						<span class="text-sm font-medium text-white" id="receiveAmount">1.5 <span class="text-white/60">(BLC)</span></span>
					</div>
				</div>
			</div>

			<!-- Continue Button -->
			<button id="continueBtn" class="btn btn--white--sm w-full mt-auto">Continue</button>
		</div>
    `

	// Back button handler
	const backBtn = document.getElementById('backBtn')
	backBtn.addEventListener('click', () => {
		import('./ProfileScreen.js').then(module => {
			module.renderProfileScreen()
		})
	})

	// Currency selector elements
	const currencySelector = document.getElementById('currencySelector')
	const currencyDropdown = document.getElementById('currencyDropdown')
	const selectedCurrencyIcon = document.getElementById('selectedCurrencyIcon')
	const selectedCurrencyText = document.getElementById('selectedCurrencyText')
	const sendAmount = document.getElementById('sendAmount')
	const receiveAmount = document.getElementById('receiveAmount')
	const balance = document.getElementById('balance')

	let currentCurrency = 'ton'

	// Toggle dropdown
	currencySelector.addEventListener('click', () => {
		currencyDropdown.classList.toggle('hidden')
	})

	// Close dropdown when clicking outside
	document.addEventListener('click', e => {
		if (!currencySelector.contains(e.target) && !currencyDropdown.contains(e.target)) {
			currencyDropdown.classList.add('hidden')
		}
	})

	// Handle currency selection
	const currencyOptions = document.querySelectorAll('.currency-option')
	currencyOptions.forEach(option => {
		option.addEventListener('click', () => {
			const currency = option.dataset.currency
			currentCurrency = currency

			// Update UI
			selectedCurrencyIcon.src = `/public/images/currencies/${currency}.svg`
			selectedCurrencyText.textContent = currency.toUpperCase()

			// Update balance
			const balances = {
				ton: '25.837118',
				usdt: '1000.50',
				btc: '0.0125',
				eth: '0.5432'
			}
			balance.textContent = balances[currency]

			// Hide dropdown
			currencyDropdown.classList.add('hidden')

			// Recalculate
			calculateReceive()
		})
	})

	// Calculate receive amount
	function calculateReceive() {
		const amount = parseFloat(sendAmount.value) || 0
		// Mock conversion rate - replace with real API call
		const rate = 1.0
		receiveAmount.textContent = `${(amount * rate).toFixed(2)} (BLC)`
	}

	sendAmount.addEventListener('input', calculateReceive)

	// Continue button handler
	const continueBtn = document.getElementById('continueBtn')
	continueBtn.addEventListener('click', () => {
		const amount = sendAmount.value

		// Validate input
		if (!amount || parseFloat(amount) <= 0) {
			tg.showAlert('Please enter a valid amount')
			return
		}

		// Show confirmation screen
		renderConfirmationScreen(amount, currentCurrency, receiveAmount.textContent)
	})

	// Confirmation Screen
	function renderConfirmationScreen(amount, currency, receiveText) {
		mainContent.innerHTML = /* html */ `
            <div class="screen buy-screen px-4 flex flex-col">
				<!-- Header with Back Button -->
				<button id="backToForm" class="flex items-center mb-2 gap-1.5 text-white hover:text-white/80 transition-colors">
					<svg xmlns="http://www.w3.org/2000/svg" class="size-3 shrink-0" fill="none" viewBox="0 0 20 20" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					<span class="text-sm font-medium">Back</span>
				</button>

				<div class="glass-block p-6">
					<p class="heading-normal mb-3">Send</p>
					<div class="flex items-center gap-2 mb-4 pb-4 border-b border-[rgba(71,_71,_71,_0.3);]">
						<img src="/public/images/currencies/${currency}.svg" alt="${currency.toUpperCase()}" class="size-6" />
						<span class="text-sm font-medium text-white">${amount} <span class="text-white/60">(${currency.toUpperCase()})</span></span>
					</div>

					<p class="heading-normal mb-3">Receive</p>
					<div class="flex items-center gap-2">
						<img src="/public/images/currencies/blc.svg" alt="BLC" class="size-6" />
						<span class="text-sm font-medium text-white">${receiveText.split(' ')[0]} <span class="text-white/60">(BLC)</span></span>
					</div>
				</div>

				<!-- Buy Button  -->
				<button id="confirmBuyBtn" class="btn btn--white--sm w-full mt-auto">Buy</button>
			</div>
        `

		// Back button handler
		document.getElementById('backToForm').addEventListener('click', () => {
			renderBuyScreen()
		})

		// Confirm buy button handler
		document.getElementById('confirmBuyBtn').addEventListener('click', () => {
			// Show congratulations modal and process payment
			processPurchase(amount, currency, receiveText)
		})
	}

	// Process Purchase
	function processPurchase(amount, currency, receiveText) {
		// Backend integration - send purchase request
		fetch('/api/buy', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Telegram-Init-Data': tg.initData
			},
			body: JSON.stringify({
				currency: currency,
				amount: parseFloat(amount),
				userId: tg.initDataUnsafe?.user?.id
			})
		})
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					showCongratsModal(receiveText.split(' ')[0])
				} else {
					tg.showAlert('Purchase failed: ' + data.error)
				}
			})
			.catch(error => {
				// For demo purposes, show congrats anyway
				showCongratsModal(receiveText.split(' ')[0])
				// tg.showAlert('Network error: ' + error.message)
			})
	}

	// Congratulations Modal
	function showCongratsModal(tokenAmount) {
		// Navigate to home screen and show modal there
		import('./HomeScreen.js').then(module => {
			module.renderHomeScreen()

			// Update active tab to home
			const tabButtons = document.querySelectorAll('.tab-item')
			tabButtons.forEach(btn => {
				btn.classList.remove('active')
				if (btn.getAttribute('data-tab') === 'home') {
					btn.classList.add('active')
				}
			})

			// Show congrats modal on home screen
			setTimeout(() => {
				const modal = document.createElement('div')
				modal.id = 'congratsModal'
				modal.className = 'modal-overlay'
				modal.innerHTML = /* html */ `
					<div class="modal-content">
						<button id="closeModal" class="modal-close">
							<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path
									d="M0.75 0.75L4.75 4.75M8.75 8.75L4.75 4.75M4.75 4.75L8.75 0.75M4.75 4.75L0.75 8.75"
									stroke="white"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</button>

						<h3 class="heading-lg text-center mb-5">Congratulations!</h3>

						<div class="flex flex-col items-center mb-4 p-6 rounded-lg border-[#161616]">
							<div class="mb-2">
								<img src="/public/images/currencies/blc.svg" alt="BLC" class="size-10" />
							</div>
							<div class="text-center">
								<p class="heading-xl mb-2">${tokenAmount} <span class="text-gold font-semibold">$BLC</span></p>
								<p class="text-sm text-white/50">You have bought</p>
							</div>
						</div>

						<button id="thankYouBtn" class="btn btn--white w-full">Thank You</button>
					</div>
				`

				document.body.appendChild(modal)

				// Trigger animation
				setTimeout(() => modal.classList.add('active'), 10)

				// Close handlers
				const closeModal = () => {
					modal.classList.remove('active')
					setTimeout(() => modal.remove(), 300)
				}

				document.getElementById('closeModal').addEventListener('click', closeModal)
				document.getElementById('thankYouBtn').addEventListener('click', closeModal)
			}, 300)
		})
	}
}
