// src/index.js
import { initTelegramApp } from './services/telegram.js'
import { initNavigation } from './utils/navigation.js'
import { renderHomeScreen } from './screens/HomeScreen.js'

// Initialize Telegram Mini App
const tg = initTelegramApp()

// Set username in header
const usernameElement = document.getElementById('username')
if (tg.initDataUnsafe?.user) {
	usernameElement.textContent = `${tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name}`
} else {
	usernameElement.textContent = 'username'
}

// Initialize withdraw button
const withdrawBtn = document.getElementById('withdrawBtn')
withdrawBtn.addEventListener('click', () => {
	tg.showAlert('Withdraw functionality coming soon!')
})

// Initialize navigation
initNavigation()

// Load home screen by default
renderHomeScreen()
