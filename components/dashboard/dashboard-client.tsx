'use client'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Play, ChevronRight } from 'lucide-react'
import { getMuscleGroupLabel, getMuscleEmoji, getDayName } from '@/lib/utils'

export function DashboardClient({ routine, todayDay, recentSessions, sessionsThisMonth, userId }: any) {
  const today = new Date()
  const lastSession = recentSessions[0]
  const lastVol = lastSession?.workout_sets?.reduce((a: number, s: any) => a + (s.weight_kg ?? 0) * (s.reps ?? 0), 0) ?? 0
  const exercises = todayDay?.routine_exercises ? [...todayDay.routine_exercises].sort((a: any, b: any) => a.order_index - b.order_index) : []

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgb(var(--muted))' }}>
          {getDayName(today.getDay())}, {format(today, "d 'de' MMMM", { locale: es })}
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold">
          {today.getHours() < 12 ? 'Buenos días 👋' : today.getHours() < 18 ? 'Buenas tardes 👋' : 'Buenas noches 👋'}
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { val: sessionsThisMonth, label: 'Sesiones este mes' },
          { val: lastVol > 0 ? `${(lastVol / 1000).toFixed(1)}t` : '—', label: 'Volumen última sesión' },
          { val: lastSession ? format(new Date(lastSession.finished_at), 'dd MMM', { locale: es }) : '—', label: 'Último entreno' },
          { val: routine ? '✓' : '—', label: routine ? routine.name : 'Sin rutina activa' },
        ].map(({ val, label }, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ backgroundColor: 'rgb(var(--bg-elevated))' }}>
            <div className="text-2xl font-bold" style={{ color: 'rgb(var(--accent))' }}>{val}</div>
            <div className="text-xs mt-1 leading-tight" style={{ color: 'rgb(var(--muted))' }}>{label}</div>
          </div>
        ))}
      </div>

      {routine ? (
        <div className="rounded-2xl overflow-hidden mb-6" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--border))' }}>
          <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgb(var(--border))' }}>
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgb(var(--muted))' }}>Rutina del día</p>
              <h2 className="font-display text-xl font-semibold">{todayDay?.day_label ?? routine.name}</h2>
            </div>
            {todayDay
              ? <span className="text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wide" style={{ backgroundColor: 'rgba(201,168,76,0.12)', color: 'rgb(var(--accent))' }}>
                  Hoy · {getDayName(todayDay.day_of_week, true)}
                </span>
              : <span className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Día de descanso</span>
            }
          </div>
          {exercises.length > 0 ? (
            <>
              {exercises.map((re: any) => (
                <div key={re.id} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: '1px solid rgb(var(--border))' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: 'rgba(201,168,76,0.1)' }}>
                    {getMuscleEmoji(re.exercise?.muscle_group)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{re.exercise?.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
                      {re.target_sets} × {re.target_reps} · {getMuscleGroupLabel(re.exercise?.muscle_group)}
                    </div>
                  </div>
                </div>
              ))}
              <div className="p-5">
                <Link href={`/workout?routineId=${routine.id}`} className="flex items-center justify-center gap-2 w-full py-4 text-black font-semibold rounded-xl text-sm" style={{ backgroundColor: 'rgb(var(--accent))' }}>
                  <Play size={16} /> Iniciar Entrenamiento
                </Link>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm" style={{ color: 'rgb(var(--muted))' }}>Día de descanso 🌟</div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl p-8 text-center mb-6" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: '1px dashed rgb(var(--border))' }}>
          <p className="mb-4" style={{ color: 'rgb(var(--muted))' }}>No tienes una rutina activa</p>
          <Link href="/routines/new" className="inline-flex px-5 py-2.5 text-black font-semibold text-sm rounded-xl" style={{ backgroundColor: 'rgb(var(--accent))' }}>
            Crear Rutina
          </Link>
        </div>
      )}

      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Sesiones recientes</h3>
            <Link href="/history" className="text-xs flex items-center gap-1" style={{ color: 'rgb(var(--accent))' }}>
              Ver todo <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentSessions.slice(0, 3).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-4 rounded-xl" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--border))' }}>
                <div>
                  <div className="text-sm font-medium">{s.routine?.name ?? 'Sesión libre'}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
                    {s.finished_at ? format(new Date(s.finished_at), "d MMM, HH:mm", { locale: es }) : '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold" style={{ color: 'rgb(var(--accent))' }}>
                    {(s.workout_sets?.reduce((a: number, x: any) => a + (x.weight_kg ?? 0) * (x.reps ?? 0), 0) ?? 0).toLocaleString()} kg
                  </div>
                  <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{s.workout_sets?.length ?? 0} series</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
