// src/index.js
import { initTelegramApp } from './services/telegram.js'
import { initNavigation } from './utils/navigation.js'
import { renderWelcomeScreen } from './screens/WelcomeScreen.js'

// Initialize Telegram Mini App
const tg = initTelegramApp()

// Set username in header
const usernameElement = document.getElementById('username')
if (tg.initDataUnsafe?.user) {
	usernameElement.textContent = `${tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name}`
} else {
	usernameElement.textContent = 'username'
}

// Withdraw buttons handler - use event delegation
document.addEventListener('click', e => {
	if (e.target.classList.contains('withdraw-btn') || e.target.closest('.withdraw-btn')) {
		console.log('Withdraw button clicked via delegation')
		import('./screens/WithdrawScreen.js')
			.then(module => {
				module.renderWithdrawScreen()
			})
			.catch(err => {
				console.error('Error loading WithdrawScreen:', err)
			})
	}
})

// Initialize navigation
initNavigation()

// Load welcome screen by default
renderWelcomeScreen()
