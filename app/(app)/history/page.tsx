import { createServerClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { formatDuration } from '@/lib/utils'
export default async function HistoryPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: sessions } = await supabase.from('workout_sessions')
    .select('*, routine:routines(name), workout_sets(weight_kg, reps)')
    .eq('user_id', session.user.id).eq('status', 'completed')
    .order('finished_at', { ascending: false }).limit(50)
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgb(var(--muted))' }}>Registro</p>
        <h1 className="font-display text-3xl font-semibold">Historial</h1>
      </div>
      {sessions && sessions.length > 0 ? (
        <div className="space-y-3">
          {(sessions as any[]).map((s) => {
            const vol = s.workout_sets?.reduce((a: number, x: any) => a + (x.weight_kg ?? 0) * (x.reps ?? 0), 0) ?? 0
            const dur = s.finished_at && s.started_at ? Math.floor((new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) / 1000) : 0
            return (
              <div key={s.id} className="rounded-2xl p-5" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--border))' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{(s.routine as any)?.name ?? 'Sesión libre'}</div>
                    <div className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
                      {s.finished_at ? format(new Date(s.finished_at), "d 'de' MMMM, yyyy", { locale: es }) : '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold" style={{ color: 'rgb(var(--accent))' }}>{vol > 0 ? `${vol.toLocaleString()} kg` : '—'}</div>
                    <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{dur > 0 ? formatDuration(dur) : ''}</div>
                  </div>
                </div>
                <div className="text-xs mt-2" style={{ color: 'rgb(var(--muted))' }}>{s.workout_sets?.length ?? 0} series</div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20" style={{ color: 'rgb(var(--muted))' }}>
          <div className="text-5xl mb-4">📊</div>
          <p className="mb-4">Sin sesiones aún</p>
          <Link href="/workout" className="px-6 py-3 text-black font-semibold rounded-xl" style={{ backgroundColor: 'rgb(var(--accent))' }}>Entrenar Ahora</Link>
        </div>
      )}
    </div>
  )
}
