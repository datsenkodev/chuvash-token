// src/screens/HomeScreen.js

export function renderWelcomeScreen() {
	const mainContent = document.getElementById('mainContent')
	mainContent.innerHTML = /* html */ `
        <main  class="self-stretch flex text-white font-bold text-[52px] align-text-top" data-name="Онбординг">
            <div class="flex flex-col frame justify-between items-center relative bg-black min-h-[812px] min-w-[375px] w-full mx-auto px-5" data-name="Добро пожаловать">
                <div  class="flex flex-col frame items-center self-stretch w-full" data-name="Frame 1453203457">
                    <div class="flex flex-col frame items-center self-stretch h-fit w-full" data-name="Frame 1453203444">
                        <div class="flex flex-row frame self-stretch w-full gap-x-[7px] mt-28 mb-7" data-name="Frame 1">
                            <svg class="border-[1.74px] border-solid flex grow shrink w-20 h-px border-white" data-name="Arrow 1"
                            xmlns="http://www.w3.org/2000/svg"></svg>

                            <svg class=" border-[1.74px] border-solid flex grow shrink w-20 h-px border-gray-500" data-name="Arrow 2"
                                xmlns="http://www.w3.org/2000/svg"></svg>

                            <svg class=" border-[1.74px] border-solid flex grow shrink w-20 h-px border-gray-500" data-name="Arrow 3"
                                xmlns="http://www.w3.org/2000/svg"></svg>

                            <svg class=" border-[1.74px] border-solid flex grow shrink w-20 h-px border-gray-500" data-name="Arrow 4"
                                xmlns="http://www.w3.org/2000/svg"></svg>
                        </div>
                        <div class="flex flex-col frame self-stretch mx-5" data-name="Frame 56">
                            <span class="flex font-[700] leading-11">
                                Добро пожаловать
                            </span>
                        </div>
                    </div>
                </div>
                <div class="relative min-h-[375px] min-w-[375px]" data-name="Frame 1453203426">
                    <div class="absolute top-20 left-7 h-[267px] w-[267px] opacity-50">
                        <svg viewBox='0 0 266.51 267.21'>
                        <defs>
                            <linearGradient id="gradient-linear82270890">
                                <stop stop-color="rgb(213,175,74)" offset="0%" />
                                <stop stop-color="rgb(242,233,131)" offset="46%" />
                                <stop stop-color="rgb(242,233,131)" offset="74%" />
                                <stop stop-color="rgb(213,177,75)" offset="100%" />
                            </linearGradient>
                        </defs>
                        <ellipse id="el_ellipse82270890" rx=133.26 ry=133.60 cx=133.26 cy=133.60
                            filter="url(#f1_ellipse82270890)" fill="url(#gradient-linear82270890)"> </ellipse>
                        </svg>
                    </div>
                </div>
            <div class="flex flex-col frame self-stretch items-center w-full" data-name="Frame 1453203452">
                <div class="flex flex-col frame self-stretch w-full gap-3.5 h-fit text-wrap py-2" data-name="Frame 1453203443">
                    <span class="flex text-wrap w-full text-[16px]  tracking-[-0.41px] text-left align-text-top font-[400] h-16">
                        ОписаниеОписаниеОписаниеОписаниеОписание ОписаниеОписаниеОписаниеОписаниеОписание Описание
                    </span>
                    <div class="flex flex-row frame w-full self-stretch gap-2" data-name="Frame 1453203445">
                        <div class="flex flex-row instance justify-between strokes508715 items-center bg-white border-[#474747] w-full rounded-[423243px] h-11 px-6 py-2" data-name="Buttons">
                            <span class="flex text-[16px] font-[500] tracking-[-0.41px] text-left align-text-top w-full text-[#171614]">
                                Далее
                            </span>
                            <svg class="border-[1.5px] flex w-4 border-solid border-black h-px" data-name="Arrow 6"
                                xmlns="http://www.w3.org/2000/svg"></svg>
                        </div>
                    </div>
                </div>
                <div class="flex relative w-94 h-8.5" data-name="Home Indicator">
                    <svg  class="absolute -left-20 bottom-[23.53%] h-1 w-33 rounded-25 fill-white" data-name="Home Indicator"
                        xmlns="http://www.w3.org/2000/svg">
                        <g xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M0 2.5C0 1.11929 1.11929 0 2.5 0L131.5 0C132.881 0 134 1.11929 134 2.5L134 2.5C134 3.88071 132.881 5 131.5 5L2.5 5C1.11929 5 0 3.88071 0 2.5L0 2.5Z"
                                fill-rule="nonzero" fill="rgb(255,255,255)"></path>
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    </main>
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
