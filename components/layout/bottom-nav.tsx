'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Dumbbell, ClipboardList, TrendingUp, History } from 'lucide-react'
const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/workout', label: 'Hoy', icon: Dumbbell },
  { href: '/routines', label: 'Rutinas', icon: ClipboardList },
  { href: '/progress', label: 'Progreso', icon: TrendingUp },
  { href: '/history', label: 'Historial', icon: History },
]
export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ backgroundColor: 'rgb(var(--bg-surface))', borderTop: '1px solid rgb(var(--border))' }}>
      <div className="flex">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 flex-1 pt-3 pb-4 text-[10px] font-medium"
              style={{ color: active ? 'rgb(var(--accent))' : 'rgb(var(--muted))' }}>
              <Icon size={20} />{label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
