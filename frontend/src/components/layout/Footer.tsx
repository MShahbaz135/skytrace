import { Logo } from '@/components/ui/Logo'
import { Globe, Mail, MessageCircle } from 'lucide-react'

const COLUMNS = [
  {
    title: 'Product',
    links: ['Live Map', 'Flight Search', 'Airports', 'Airlines', 'Coverage'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Press', 'Contact', 'Blog'],
  },
  {
    title: 'Resources',
    links: ['API Docs', 'Status', 'Help Center', 'Privacy', 'Terms'],
  },
]

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-ink-900/50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Real-time flight tracking, reimagined. Follow every aircraft in the sky on a
              beautiful, lightning-fast map.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {[MessageCircle, Globe, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-muted transition-colors hover:text-white"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted transition-colors hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:flex-row">
          <p className="text-xs text-muted-dim">
            © {new Date().getFullYear()} SkyTrace. Demo project — flight data is simulated.
          </p>
          <p className="text-xs text-muted-dim">Built with React · Vite · Tailwind</p>
        </div>
      </div>
    </footer>
  )
}
