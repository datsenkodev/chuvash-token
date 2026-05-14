// src/components/BottomNav.js
export function renderBottomNav() {
	const nav = document.createElement('nav');
	nav.className = 'bottom-tabs';

	nav.innerHTML = `
		<button class="tab-item active" data-tab="home">
			<img src="./public/images/home-icon.svg" alt="chuvash token icon" class="size-6" />
			<span>Home</span>
		</button>
		<button class="tab-item" data-tab="referral">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M14.4902 17.5H16.0002C19.0202 17.5 21.5002 15.03 21.5002 12C21.5002 8.98 19.0302 6.5 16.0002 6.5H14.4902"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path d="M8.5 6.5H7C3.97 6.5 1.5 8.97 1.5 12C1.5 15.02 3.97 17.5 7 17.5H8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
				<path d="M7.5 12H15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			<span>Referral</span>
		</button>
		<button class="tab-item" data-tab="profile">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M12.1605 10.87C12.0605 10.86 11.9405 10.86 11.8305 10.87C9.45055 10.79 7.56055 8.84 7.56055 6.44C7.56055 3.99 9.54055 2 12.0005 2C14.4505 2 16.4405 3.99 16.4405 6.44C16.4305 8.84 14.5405 10.79 12.1605 10.87Z"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M7.15973 14.56C4.73973 16.18 4.73973 18.82 7.15973 20.43C9.90973 22.27 14.4197 22.27 17.1697 20.43C19.5897 18.81 19.5897 16.17 17.1697 14.56C14.4297 12.73 9.91973 12.73 7.15973 14.56Z"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<span>Profile</span>
		</button>
	`;

	return nav;
}

export function initBottomNav() {
	const app = document.getElementById('app');
	if (!app) {
		console.error('BottomNav: #app element not found');
		return;
	}
	try {
		const nav = renderBottomNav();
		app.appendChild(nav);
		console.log('BottomNav initialized successfully');
	} catch (err) {
		console.error('BottomNav initialization error:', err);
	}
}
