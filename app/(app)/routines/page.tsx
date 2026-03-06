import { createServerClient } from '@/lib/supabase/server'
import { RoutineCard } from '@/components/routines/routine-card'
import Link from 'next/link'
export default async function RoutinesPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: routines } = await supabase.from('routines')
    .select('*, routine_days(day_of_week, day_label)')
    .eq('user_id', session.user.id).order('created_at', { ascending: false })
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgb(var(--muted))' }}>Mis programas</p>
          <h1 className="font-display text-3xl font-semibold">Rutinas</h1>
        </div>
        <Link href="/routines/new" className="px-4 py-2.5 text-black font-semibold text-sm rounded-xl" style={{ backgroundColor: 'rgb(var(--accent))' }}>
          + Nueva
        </Link>
      </div>
      {routines && routines.length > 0
        ? <div className="space-y-4">{(routines as any[]).map((r) => <RoutineCard key={r.id} routine={r} />)}</div>
        : <div className="text-center py-20" style={{ color: 'rgb(var(--muted))' }}>
            <div className="text-5xl mb-4">📋</div>
            <p className="mb-4">Sin rutinas aún</p>
            <Link href="/routines/new" className="px-6 py-3 text-black font-semibold rounded-xl" style={{ backgroundColor: 'rgb(var(--accent))' }}>Crear Rutina</Link>
          </div>
      }
    </div>
  )
}
