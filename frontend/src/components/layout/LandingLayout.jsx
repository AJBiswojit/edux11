import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LandingNavbar } from '@/components/landing/navbar'
import { LandingFooter } from '@/components/landing/footer'

function LandingLayout() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <LandingNavbar />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  )
}

export { LandingLayout }
export default LandingLayout
