import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { LandingPage } from '@/pages/LandingPage'
import { LivePage } from '@/pages/LivePage'
import { FlightDetailPage } from '@/pages/FlightDetailPage'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])
  return null
}

function Layout() {
  const { pathname } = useLocation()
  const isLive = pathname === '/live'

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/flight/:id" element={<FlightDetailPage />} />
        </Routes>
      </main>
      {!isLive && <Footer />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Layout />
    </BrowserRouter>
  )
}
