import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Radar } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/live', label: 'Live Map' },
  { to: '/#features', label: 'Features' },
  { to: '/#coverage', label: 'Coverage' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'py-2' : 'py-4',
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav
          className={cn(
            'flex items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300',
            scrolled ? 'glass-strong shadow-xl shadow-black/30' : 'border border-transparent',
          )}
        >
          <Logo />

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <NavItem key={link.to} to={link.to} label={link.label} />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/live"
              className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-sky-soft to-accent px-4 py-2 text-sm font-semibold text-ink-950 shadow-lg shadow-sky-glow/20 transition-all hover:shadow-sky-glow/40 hover:brightness-110 sm:flex"
            >
              <Radar className="size-4" />
              Track Live
            </Link>
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
              className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-muted transition-colors hover:text-white md:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="glass-strong mt-2 overflow-hidden rounded-2xl p-2 md:hidden"
            >
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

function NavItem({ to, label }: { to: string; label: string }) {
  const isHashLink = to.includes('#')
  if (isHashLink) {
    return (
      <a
        href={to}
        className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-white"
      >
        {label}
      </a>
    )
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'rounded-xl px-3.5 py-2 text-sm font-medium transition-colors hover:text-white',
          isActive ? 'text-white' : 'text-muted',
        )
      }
    >
      {label}
    </NavLink>
  )
}
