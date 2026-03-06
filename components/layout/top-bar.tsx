'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
export function TopBar({ profile }: { profile: any }) {
  const router = useRouter()
  const supabase = createClient()
  const logout = async () => { await supabase.auth.signOut(); router.push('/login'); router.refresh() }
  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  return (
    <header className="flex items-center justify-between px-6 py-4 flex-shrink-0"
      style={{ backgroundColor: 'rgb(var(--bg-surface))', borderBottom: '1px solid rgb(var(--border))' }}>
      <div className="md:hidden font-display text-xl font-bold">
        <span style={{ color: 'rgb(var(--accent))' }}>Aureo </span>Lift
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <button onClick={logout} style={{ color: 'rgb(var(--muted))' }}><LogOut size={16} /></button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-black text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), #8B5E1A)' }}>
          {initials}
        </div>
      </div>
    </header>
  )
}
