// src/screens/HomeScreen.js

export function renderHomeScreen() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="screen home-screen">
            <div class="content-blocks">
                <div class="block block-1">
                    <div class="block-icon">💰</div>
                    <h3>Balance</h3>
                    <p class="block-value">1,250 tokens</p>
                    <button class="block-btn">View Details</button>
                </div>
                <div class="block block-2">
                    <div class="block-icon">🎁</div>
                    <h3>Rewards</h3>
                    <p class="block-value">350 tokens</p>
                    <button class="block-btn">Claim Now</button>
                </div>
            </div>
        </div>
    `;

    // Add event listeners
    const buttons = mainContent.querySelectorAll('.block-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const blockText = e.target.closest('.block').querySelector('h3').textContent;
            window.Telegram.WebApp.showAlert(`${blockText} clicked!`);
        });
    });
}