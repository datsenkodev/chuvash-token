// src/components/Header.js
export function renderHeader() {
	const header = document.createElement('header');
	header.className = 'header';

	header.innerHTML = `
		<div class="user-info">
			<span id="username">Loading...</span>
		</div>
		<button class="btn withdraw-btn">Withdraw</button>
	`;

	return header;
}

export function initHeader() {
	const app = document.getElementById('app');
	if (!app) {
		console.error('Header: #app element not found');
		return;
	}
	try {
		const header = renderHeader();
		app.insertBefore(header, app.firstChild);
		console.log('Header initialized successfully');
	} catch (err) {
		console.error('Header initialization error:', err);
	}
}
