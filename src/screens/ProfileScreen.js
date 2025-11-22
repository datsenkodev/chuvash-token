// src/screens/ProfileScreen.js

export function renderProfileScreen() {
    const mainContent = document.getElementById('mainContent');
    const tg = window.Telegram.WebApp;
    const user = tg.initDataUnsafe?.user;

    mainContent.innerHTML = `
        <div class="screen profile-screen">
            <div class="profile-header">
                <div class="profile-avatar">${user?.first_name?.charAt(0) || 'U'}</div>
                <h2>${user?.first_name || 'User'} ${user?.last_name || ''}</h2>
                <p class="profile-username">@${user?.username || 'username'}</p>
            </div>
            <div class="profile-stats">
                <div class="stat-item">
                    <span class="stat-label">Total Earned</span>
                    <span class="stat-value">2,500 tokens</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Referrals</span>
                    <span class="stat-value">12</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Member Since</span>
                    <span class="stat-value">Nov 2025</span>
                </div>
            </div>
        </div>
    `;
}