// src/utils/navigation.js
import { renderHomeScreen } from '../screens/HomeScreen.js';
import { renderProfileScreen } from '../screens/ProfileScreen.js';
import { renderReferralScreen } from '../screens/SettingsScreen.js';

export function initNavigation() {
    const tabButtons = document.querySelectorAll('.tab-item');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            navigateTo(tab);
            
            // Update active state
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

export function navigateTo(screen) {
    switch(screen) {
        case 'home':
            renderHomeScreen();
            break;
        case 'referral':
            renderReferralScreen();
            break;
        case 'profile':
            renderProfileScreen();
            break;
        default:
            renderHomeScreen();
    }
}