import { Header } from '@/components/layout/Header'
import { BottomTabs } from '@/components/layout/BottomTabs'
import { Outlet } from 'react-router-dom'

export function AppLayout() {
	return (
		<div id='app'>
			<Header />

			<main className='main-content'>
				<Outlet />
			</main>

			<BottomTabs />
		</div>
	)
}
