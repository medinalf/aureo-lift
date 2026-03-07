'use client'
import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getMuscleEmoji, getDayName, getProgressPercent, calculateE1RM } from '@/lib/utils'
import { QuickWorkout } from '@/components/workout/quick-workout'
import {
  Play, ChevronRight, Zap, TrendingUp, Clock, Timer, Flame,
  ArrowUpRight, ArrowDownRight, Minus as MinusIcon
} from 'lucide-react'

const A    = 'rgb(var(--accent))'
const SURF = 'rgb(var(--bg-surface))'
const ELEV = 'rgb(var(--bg-elevated))'
const BORD = 'rgb(var(--border))'
const MUT  = 'rgb(var(--muted))'
const FG   = 'rgb(var(--foreground))'

// ── Mini spark-line (SVG, no lib needed) ────────────────────────────────────
function SparkLine({ values, color = A, height = 36 }: { values: number[]; color?: string; height?: number }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 120
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.split(' ').slice(-1)[0].split(',')[0]}
              cy={pts.split(' ').slice(-1)[0].split(',')[1]}
              r={3} fill={color} />
    </svg>
  )
}

// ── 1RM badge ────────────────────────────────────────────────────────────────
function OneRMBadge({ name, current, previous }: { name: string; current: number; previous: number }) {
  const pct = getProgressPercent(current, previous)
  const up = pct > 0; const same = pct === 0
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3"
      style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: up ? 'rgba(52,199,89,0.12)' : ELEV }}>
        {up ? <ArrowUpRight size={18} style={{ color: '#34C759' }} />
             : same ? <MinusIcon size={18} style={{ color: MUT }} />
             : <ArrowDownRight size={18} style={{ color: '#FF3B30' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: MUT }}>1RM estimado</p>
        <p className="text-sm font-semibold truncate">{name}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xl font-bold">{current}<span className="text-xs font-normal ml-0.5" style={{ color: MUT }}>kg</span></p>
        <p className="text-xs font-semibold" style={{ color: up ? '#34C759' : same ? MUT : '#FF3B30' }}>
          {up ? '+' : ''}{pct}%
        </p>
      </div>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export function DashboardClient({
  userId, routine, todayDay, todayExercises, lastPerf,
  recentSessions, lastSession, weeklyVolume, topExercise1RM
}: any) {
  const [workoutOpen, setWorkoutOpen] = useState(false)
  const today = new Date()
  const hour  = today.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const hasToday = todayDay && todayExercises.length > 0

  // Volumen de la sesión anterior para comparativa
  const prevSession = recentSessions[1] ?? null
  const lastVol  = lastSession?.workout_sets?.reduce((a: number, s: any) => a + (s.weight_kg??0)*(s.reps??0), 0) ?? 0
  const prevVol  = prevSession?.workout_sets?.reduce((a: number, s: any) => a + (s.weight_kg??0)*(s.reps??0), 0) ?? 0
  const volDiff  = lastVol && prevVol ? getProgressPercent(lastVol, prevVol) : null

  // Últimos volumenes para sparkline
  const volSeries = recentSessions
    .slice().reverse()
    .map((s: any) => s.workout_sets?.reduce((a: number, x: any) => a + (x.weight_kg??0)*(x.reps??0), 0) ?? 0)
    .filter((v: number) => v > 0)

  return (
    <>
      {workoutOpen && hasToday && (
        <QuickWorkout
          userId={userId} routine={routine} todayDay={todayDay}
          todayExercises={todayExercises} lastPerf={lastPerf}
          onClose={() => setWorkoutOpen(false)} />
      )}

      <div className="p-5 md:p-8 max-w-2xl mx-auto">

        {/* ── Greeting ── */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: MUT }}>
            {getDayName(today.getDay())}, {format(today, "d 'de' MMMM", { locale: es })}
          </p>
          <h1 className="font-display text-3xl font-semibold">{greeting} 👋</h1>
        </div>

        {/* ── Today card + CTA ── */}
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
          {hasToday ? (
            <>
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs uppercase tracking-widest" style={{ color: A }}>
                      Hoy · {getDayName(today.getDay(), true)}
                    </span>
                    <h2 className="font-display text-xl font-semibold mt-0.5">
                      {todayDay.day_label ?? routine?.name}
                    </h2>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: 'rgba(201,168,76,0.12)', color: A }}>
                    {todayExercises.length} ejercicios
                  </span>
                </div>

                {/* Exercise list with last values */}
                <div className="space-y-2 mb-4">
                  {todayExercises.slice(0, 4).map((re: any) => {
                    const prev = lastPerf[re.exercise_id]?.[0]
                    const e1rm = prev ? calculateE1RM(prev.weight_kg, prev.reps) : null
                    return (
                      <div key={re.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ backgroundColor: ELEV }}>
                        <span className="text-lg">{getMuscleEmoji(re.exercise?.muscle_group)}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{re.exercise?.name}</span>
                          <span className="text-xs" style={{ color: MUT }}>
                            {re.target_sets} × {re.target_reps}
                            {e1rm ? ` · 1RM ~${e1rm}kg` : ''}
                          </span>
                        </div>
                        {prev && (
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-bold" style={{ color: A }}>
                              {prev.weight_kg}kg × {prev.reps}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {todayExercises.length > 4 && (
                    <p className="text-xs text-center py-1" style={{ color: MUT }}>
                      +{todayExercises.length - 4} ejercicios más
                    </p>
                  )}
                </div>
              </div>

              {/* BIG CTA */}
              <button onClick={() => setWorkoutOpen(true)}
                className="w-full flex items-center justify-center gap-3 py-4 text-black font-bold text-base transition-opacity active:opacity-80"
                style={{ backgroundColor: A }}>
                <Play size={18} strokeWidth={2.5} />
                ENTRENAR HOY
              </button>
            </>
          ) : (
            <div className="px-5 py-8 text-center">
              {routine ? (
                <>
                  <p className="text-3xl mb-2">😴</p>
                  <p className="font-semibold mb-1">Día de descanso</p>
                  <p className="text-sm mb-4" style={{ color: MUT }}>Recuperate. El próximo entrenamiento está cerca.</p>
                  <Link href="/hiit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: ELEV, color: MUT, border: `1px solid ${BORD}` }}>
                    <Timer size={15} /> Hacer HIIT / Cardio
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-3xl mb-2">📋</p>
                  <p className="font-semibold mb-3">Sin rutina activa</p>
                  <Link href="/routines/new"
                    className="inline-flex px-5 py-2.5 text-black font-semibold text-sm rounded-xl"
                    style={{ backgroundColor: A }}>Crear Rutina</Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── HIIT shortcut (always visible, secondary) ── */}
        <Link href="/hiit"
          className="flex items-center justify-between px-4 py-3 rounded-2xl mb-6"
          style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(231,76,60,0.12)' }}>
              <Flame size={16} style={{ color: '#e74c3c' }} />
            </div>
            <div>
              <p className="text-sm font-semibold">HIIT / Tabata / Cardio</p>
              <p className="text-xs" style={{ color: MUT }}>Tabata 20/10 · HIIT 30/30 · EMOM</p>
            </div>
          </div>
          <ChevronRight size={15} style={{ color: MUT }} />
        </Link>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={13} style={{ color: A }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: MUT }}>Vol. semanal</span>
            </div>
            <p className="text-2xl font-bold">
              {weeklyVolume > 0 ? `${(weeklyVolume/1000).toFixed(1)}t` : '—'}
            </p>
            {volDiff !== null && (
              <p className="text-xs mt-1" style={{ color: volDiff >= 0 ? '#34C759' : '#FF3B30' }}>
                {volDiff >= 0 ? '↑' : '↓'} {Math.abs(volDiff)}% vs anterior
              </p>
            )}
            {volSeries.length >= 2 && (
              <div className="mt-2 opacity-70">
                <SparkLine values={volSeries} />
              </div>
            )}
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={13} style={{ color: A }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: MUT }}>Última sesión</span>
            </div>
            <p className="text-2xl font-bold">
              {lastSession?.finished_at
                ? format(new Date(lastSession.finished_at), "d MMM", { locale: es })
                : '—'}
            </p>
            {lastVol > 0 && (
              <p className="text-xs mt-1" style={{ color: MUT }}>
                {lastVol.toLocaleString()} kg volumen
              </p>
            )}
          </div>
        </div>

        {/* ── 1RM Badge ── */}
        {topExercise1RM && (
          <div className="mb-4">
            <OneRMBadge
              name={topExercise1RM.name}
              current={topExercise1RM.current}
              previous={topExercise1RM.previous} />
          </div>
        )}

        {/* ── Recent sessions ── */}
        {recentSessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Sesiones recientes</h3>
              <Link href="/history" className="text-xs flex items-center gap-1" style={{ color: A }}>
                Ver todo <ChevronRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {recentSessions.slice(0, 3).map((s: any) => {
                const vol = s.workout_sets?.reduce((a: number, x: any) => a + (x.weight_kg??0)*(x.reps??0), 0) ?? 0
                const dur = s.started_at && s.finished_at
                  ? Math.round((new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) / 60000)
                  : null
                return (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.routine?.name ?? 'Sesión libre'}</div>
                      <div className="text-xs mt-0.5 flex gap-2" style={{ color: MUT }}>
                        <span>{s.finished_at ? format(new Date(s.finished_at), "d MMM · HH:mm", { locale: es }) : '—'}</span>
                        {dur && <span>· {dur}min</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-sm font-bold" style={{ color: A }}>
                        {vol > 0 ? `${vol.toLocaleString()}kg` : '—'}
                      </div>
                      <div className="text-xs" style={{ color: MUT }}>{s.workout_sets?.length ?? 0} series</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
