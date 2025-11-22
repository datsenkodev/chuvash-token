// src/screens/SettingsScreen.js (now ReferralScreen)

export function renderReferralScreen() {
    const mainContent = document.getElementById('mainContent');
    const tg = window.Telegram.WebApp;
    const userId = tg.initDataUnsafe?.user?.id || '123456';
    const referralLink = `https://t.me/your_bot?start=${userId}`;

    mainContent.innerHTML = `
        <div class="screen referral-screen">
            <div class="referral-header">
                <h2>Invite Friends</h2>
                <p>Get 100 tokens for each friend!</p>
            </div>
            <div class="referral-link-container">
                <input type="text" class="referral-link" value="${referralLink}" readonly>
                <button class="copy-btn" id="copyBtn">Copy</button>
            </div>
            <div class="referral-stats">
                <div class="stat-box">
                    <span class="stat-number">12</span>
                    <span class="stat-label">Friends Invited</span>
                </div>
                <div class="stat-box">
                    <span class="stat-number">1,200</span>
                    <span class="stat-label">Tokens Earned</span>
                </div>
            </div>
        </div>
    `;

    // Copy functionality
    const copyBtn = document.getElementById('copyBtn');
    copyBtn.addEventListener('click', () => {
        const linkInput = document.querySelector('.referral-link');
        linkInput.select();
        navigator.clipboard.writeText(referralLink);
        tg.showAlert('Link copied to clipboard!');
    });
}