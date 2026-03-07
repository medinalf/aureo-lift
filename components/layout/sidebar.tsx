'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from './theme-provider'
import { LayoutDashboard, ClipboardList, TrendingUp, History, Flame, Sun, Moon } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/routines',  label: 'Rutinas',    icon: ClipboardList },
  { href: '/hiit',      label: 'HIIT / Cardio', icon: Flame },
  { href: '/progress',  label: 'Progresión', icon: TrendingUp },
  { href: '/history',   label: 'Historial',  icon: History },
]

export function Sidebar({ profile }: { profile: any }) {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  return (
    <aside className="hidden md:flex flex-col w-56 flex-shrink-0 py-7"
      style={{ backgroundColor: 'rgb(var(--bg-surface))', borderRight: '1px solid rgb(var(--border))' }}>
      <div className="px-6 mb-8">
        <span className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--accent))' }}>Aureo </span>
        <span className="font-display text-2xl font-light">Lift</span>
      </div>
      <nav className="flex-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors relative"
              style={{ color: active ? 'rgb(var(--accent))' : 'rgb(var(--muted))' }}>
              {active && <span className="absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-r"
                style={{ backgroundColor: 'rgb(var(--accent))' }} />}
              <Icon size={16} />{label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 pt-4" style={{ borderTop: '1px solid rgb(var(--border))' }}>
        <button onClick={toggle} className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs"
          style={{ backgroundColor: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--border))', color: 'rgb(var(--muted))' }}>
          <span>{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
          {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
      </div>
    </aside>
  )
}
