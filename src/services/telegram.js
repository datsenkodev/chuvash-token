// src/services/telegram.js

export function initTelegramApp() {
    const tg = window.Telegram.WebApp;
    
    // Expand the app to full height
    tg.expand();
    
    // Enable closing confirmation
    tg.enableClosingConfirmation();
    
    // Set header color
    tg.setHeaderColor('#000000');
    
    // Set background color
    tg.setBackgroundColor('#000000');
    
    return tg;
}

export function getTelegramUser() {
    const tg = window.Telegram.WebApp;
    return tg.initDataUnsafe?.user || null;
}

export function showAlert(message) {
    window.Telegram.WebApp.showAlert(message);
}

export function showConfirm(message, callback) {
    window.Telegram.WebApp.showConfirm(message, callback);
}

export function hapticFeedback(type = 'medium') {
    const tg = window.Telegram.WebApp;
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred(type);
    }
}