// src/screens/HomeScreen.js

export function renderHome_v1_Screen() {
	const mainContent = document.getElementById('mainContent')
	mainContent.innerHTML = /* html */ `
        <div class="self-stretch flex text-white font-bold align-text-top">
            <div class="flex flex-col frame justify-between items-center relative bg-black min-h-[812px] min-w-[375px] w-full mx-auto px-5 py-6" data-name="Home">
            <!-- Header -->
            <div class="flex flex-col frame items-center self-stretch w-full gap-4 mb-4">
                <!-- Balance Title -->
                <div class="flex flex-col frame items-center self-stretch w-full">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="w-4 h-4">
                            <img class="w-4 h-4" src="./src/images/telegram-1.png" alt="Balance Icon">
                        </div>
                        <span class="text-base font-[400] text-gray-400">Total balance</span>
                    </div>
                    <div class="text-xl font-bold">
                        <span>320 322 </span>
                        <span class="golden-text">$BLC</span>
                    </div>
                </div>
            </div>

            <!-- Cards Grid -->
            <div class="flex flex-col frame self-stretch items-center flex-1 ">
                <div class="grid grid-cols-2 w-[343px] h-[424px] gap-0.5">
                    <!-- Card 1 -->
                    <div class="glass-card card-bg rounded-3xl h-52 overflow-hidden h-full" style="background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><defs><linearGradient id=%22g1%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22><stop offset=%220%25%22 style=%22stop-color:rgb(200,50,50);stop-opacity:1%22 /><stop offset=%22100%25%22 style=%22stop-color:rgb(255,150,0);stop-opacity:1%22 /></linearGradient></defs><rect fill=%22url(%23g1)%22 width=%22200%22 height=%22200%22/></svg>');">
                        <div class="card-content flex items-center justify-center h-full">
                            <img src="./src/images/Homescreen1.png" alt="" сlass="w-full h-full">         
                        </div>
                    </div>

                    <!-- Card 2 -->
                    <div class="glass-card card-bg rounded-3xl h-full w-42 overflow-hidden" style="background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><defs><linearGradient id=%22g2%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22><stop offset=%220%25%22 style=%22stop-color:rgb(100,100,100);stop-opacity:1%22 /><stop offset=%22100%25%22 style=%22stop-color:rgb(50,50,50);stop-opacity:1%22 /></linearGradient></defs><rect fill=%22url(%23g2)%22 width=%22200%22 height=%22200%22/></svg>');">
                        <div class="card-content flex items-center justify-center h-full">
                            <img src="./src/images/Homescreen2.png" alt="" сlass="w-full h-full">
                        </div>
                    </div>

                    <!-- Card 3 -->
                    <div class="glass-card card-bg rounded-3xl h-full overflow-hidden" style="background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><defs><linearGradient id=%22g3%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22><stop offset=%220%25%22 style=%22stop-color:rgb(50,50,50);stop-opacity:1%22 /><stop offset=%22100%25%22 style=%22stop-color:rgb(30,30,30);stop-opacity:1%22 /></linearGradient></defs><rect fill=%22url(%23g3)%22 width=%22200%22 height=%22200%22/></svg>');">
                        <div class="card-content flex items-center justify-center h-full">
                            <img src="./src/images/Homescreen3.png" alt="" сlass="w-full h-full">
                        </div>
                    </div>

                    <!-- Card 4 -->
                    <div class="glass-card card-bg rounded-3xl h-full overflow-hidden" style="background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><defs><linearGradient id=%22g4%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22><stop offset=%220%25%22 style=%22stop-color:rgb(30,30,30);stop-opacity:1%22 /><stop offset=%22100%25%22 style=%22stop-color:rgb(20,20,20);stop-opacity:1%22 /></linearGradient></defs><rect fill=%22url(%23g4)%22 width=%22200%22 height=%22200%22/></svg>');">
                        <div class="card-content flex items-center justify-center h-full">
                            <img src="./src/images/Homescreen4.png" alt="" сlass="w-full h-full">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Home Indicator -->
            <div class="flex relative w-94 h-8.5">
                <svg class="absolute -left-20 bottom-[23.53%] h-1 w-33 rounded-25 fill-white" data-name="Home Indicator" xmlns="http://www.w3.org/2000/svg">
                    <g xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 2.5C0 1.11929 1.11929 0 2.5 0L131.5 0C132.881 0 134 1.11929 134 2.5L134 2.5C134 3.88071 132.881 5 131.5 5L2.5 5C1.11929 5 0 3.88071 0 2.5L0 2.5Z" fill-rule="nonzero" fill="rgb(255,255,255)"></path>
                    </g>
                </svg>
            </div>
            </div>
        </div>
    `

	// Add event listeners
	const buttons = mainContent.querySelectorAll('.block-btn')
	buttons.forEach(btn => {
		btn.addEventListener('click', e => {
			const blockText = e.target.closest('.block').querySelector('h3').textContent
			window.Telegram.WebApp.showAlert(`${blockText} clicked!`)
		})
	})
}
