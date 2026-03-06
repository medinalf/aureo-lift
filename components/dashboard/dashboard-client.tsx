'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { getMuscleEmoji, getMuscleGroupLabel, formatDuration, getDayName } from '@/lib/utils'
import { Play, ChevronRight, Zap, TrendingUp, Clock, Plus, Check, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

const A = 'rgb(var(--accent))'
const SURF = 'rgb(var(--bg-surface))'
const ELEV = 'rgb(var(--bg-elevated))'
const BORD = 'rgb(var(--border))'
const MUT = 'rgb(var(--muted))'
const FG = 'rgb(var(--foreground))'

// ─── Set row inside quick-workout ─────────────────────────────────────────────
function SetRow({ set, idx, onUpdate, onComplete }: any) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-5 text-center text-xs font-semibold flex-shrink-0"
        style={{ color: set.done ? A : MUT }}>{idx + 1}</span>
      <input
        type="number" inputMode="decimal"
        value={set.kg || ''}
        onChange={e => onUpdate({ kg: parseFloat(e.target.value) || 0 })}
        placeholder="kg"
        className="w-16 py-2 text-center text-sm font-semibold rounded-xl focus:outline-none"
        style={{ backgroundColor: 'rgb(var(--bg-input))', border: `1px solid ${set.done ? A : BORD}`, color: FG }}
      />
      <span className="text-xs flex-shrink-0" style={{ color: MUT }}>×</span>
      <input
        type="number" inputMode="numeric"
        value={set.reps || ''}
        onChange={e => onUpdate({ reps: parseInt(e.target.value) || 0 })}
        placeholder="reps"
        className="w-16 py-2 text-center text-sm font-semibold rounded-xl focus:outline-none"
        style={{ backgroundColor: 'rgb(var(--bg-input))', border: `1px solid ${set.done ? A : BORD}`, color: FG }}
      />
      <button
        onClick={onComplete}
        disabled={set.done}
        className="ml-auto w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-50"
        style={{
          backgroundColor: set.done ? 'rgba(201,168,76,0.15)' : ELEV,
          color: set.done ? A : MUT,
          border: `1px solid ${set.done ? A : BORD}`
        }}>
        <Check size={15} />
      </button>
    </div>
  )
}

// ─── Exercise card inside quick-workout ───────────────────────────────────────
function ExerciseCard({ re, lastSets, sets, onSetUpdate, onSetComplete, onAddSet }: any) {
  const [open, setOpen] = useState(true)
  const done = sets.filter((s: any) => s.done).length
  const lastBest = lastSets?.[0]
  return (
    <div className="rounded-2xl overflow-hidden mb-3"
      style={{ backgroundColor: SURF, border: `1px solid ${done === sets.length ? A : BORD}`, transition: 'border-color 0.2s' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5">
        <span className="text-2xl">{getMuscleEmoji(re.exercise?.muscle_group)}</span>
        <div className="flex-1 text-left min-w-0">
          <div className="font-semibold text-sm truncate">{re.exercise?.name}</div>
          <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: MUT }}>
            <span>{done}/{sets.length} series</span>
            {lastBest && (
              <span style={{ color: A }}>· Ant: {lastBest.weight_kg}kg × {lastBest.reps}</span>
            )}
          </div>
        </div>
        {done === sets.length
          ? <span className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'rgba(201,168,76,0.12)', color: A }}>✓</span>
          : open ? <ChevronUp size={15} style={{ color: MUT }} /> : <ChevronDown size={15} style={{ color: MUT }} />
        }
      </button>

      {open && (
        <div className="px-4 pb-3" style={{ borderTop: `1px solid ${BORD}` }}>
          {lastBest && (
            <p className="text-xs pt-2 pb-1" style={{ color: MUT }}>
              Última vez: {lastBest.weight_kg}kg × {lastBest.reps} reps
            </p>
          )}
          <div className="mt-1 space-y-0.5">
            {sets.map((s: any, i: number) => (
              <SetRow key={i} set={s} idx={i}
                onUpdate={(upd: any) => onSetUpdate(i, upd)}
                onComplete={() => onSetComplete(i)} />
            ))}
          </div>
          <button onClick={onAddSet}
            className="flex items-center gap-1.5 mt-2 text-xs py-2 w-full justify-center rounded-xl"
            style={{ color: MUT, border: `1px dashed ${BORD}` }}>
            <Plus size={12} /> Añadir serie
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Quick Workout Modal ──────────────────────────────────────────────────────
function QuickWorkout({ userId, routine, todayDay, todayExercises, lastPerf, onClose }: any) {
  const router = useRouter()
  const supabase = createClient()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(false)
  const [timerRef, setTimerRef] = useState<any>(null)

  // Build initial sets from lastPerf
  const [exerciseSets, setExerciseSets] = useState<Record<string, any[]>>(() => {
    const init: Record<string, any[]> = {}
    for (const re of todayExercises) {
      const prev = lastPerf[re.exercise_id] ?? []
      const count = re.target_sets ?? 3
      // Group prev sets by session (first `count` unique sessions)
      const sessionSets = prev.slice(0, count)
      init[re.exercise_id] = Array.from({ length: count }, (_, i) => ({
        kg: sessionSets[i]?.weight_kg ?? 0,
        reps: sessionSets[i]?.reps ?? 0,
        done: false,
      }))
    }
    return init
  })

  const startSession = async () => {
    setStarting(true)
    const { data } = await supabase.from('workout_sessions').insert({
      user_id: userId,
      routine_id: routine?.id ?? null,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }).select().single()
    if (data) {
      setSessionId((data as any).id)
      setStarted(true)
      setElapsed(0)
      const t = setInterval(() => setElapsed(e => e + 1), 1000)
      setTimerRef(t)
    }
    setStarting(false)
  }

  const updateSet = (exId: string, setIdx: number, upd: any) => {
    setExerciseSets(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, ...upd } : s)
    }))
  }

  const completeSet = (exId: string, setIdx: number) => {
    setExerciseSets(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, done: true } : s)
    }))
  }

  const addSet = (exId: string) => {
    setExerciseSets(prev => {
      const last = prev[exId]?.slice(-1)[0]
      return { ...prev, [exId]: [...(prev[exId] ?? []), { kg: last?.kg ?? 0, reps: last?.reps ?? 0, done: false }] }
    })
  }

  const finishWorkout = async () => {
    if (!sessionId) return
    setFinishing(true)
    if (timerRef) clearInterval(timerRef)

    for (const re of todayExercises) {
      const sets = exerciseSets[re.exercise_id] ?? []
      for (let i = 0; i < sets.length; i++) {
        const s = sets[i]
        if (!s.done && s.kg === 0 && s.reps === 0) continue
        await supabase.from('workout_sets').insert({
          session_id: sessionId,
          exercise_id: re.exercise_id,
          set_number: i + 1,
          weight_kg: s.kg || null,
          reps: s.reps || null,
          completed_at: new Date().toISOString(),
        })
      }
    }

    await supabase.from('workout_sessions').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
    }).eq('id', sessionId)

    router.refresh()
    onClose()
  }

  const totalDone = todayExercises.reduce((a: number, re: any) =>
    a + (exerciseSets[re.exercise_id]?.filter((s: any) => s.done).length ?? 0), 0)
  const totalSets = todayExercises.reduce((a: number, re: any) =>
    a + (exerciseSets[re.exercise_id]?.length ?? 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgb(var(--bg-primary))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ backgroundColor: SURF, borderBottom: `1px solid ${BORD}` }}>
        <div>
          <h2 className="font-display text-xl font-semibold">
            {todayDay?.day_label ?? routine?.name ?? 'Entrenamiento'}
          </h2>
          {started && (
            <p className="text-xs mt-0.5" style={{ color: A }}>{formatDuration(elapsed)} · {totalDone}/{totalSets} series</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {started && (
            <button onClick={finishWorkout} disabled={finishing}
              className="px-4 py-2 text-black font-bold text-sm rounded-xl flex items-center gap-1.5 disabled:opacity-60"
              style={{ backgroundColor: A }}>
              {finishing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Finalizar
            </button>
          )}
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: ELEV, color: MUT }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!started ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="text-5xl mb-4">🏋️</div>
            <h3 className="font-display text-2xl font-semibold mb-2">
              {todayDay?.day_label ?? 'Entrenamiento de hoy'}
            </h3>
            <p className="text-sm mb-2" style={{ color: MUT }}>
              {todayExercises.length} ejercicios · {totalSets} series programadas
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {todayExercises.slice(0, 4).map((re: any) => (
                <span key={re.id} className="text-xs px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: ELEV, color: MUT }}>
                  {getMuscleEmoji(re.exercise?.muscle_group)} {re.exercise?.name}
                </span>
              ))}
              {todayExercises.length > 4 && (
                <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: ELEV, color: MUT }}>
                  +{todayExercises.length - 4} más
                </span>
              )}
            </div>
            <button onClick={startSession} disabled={starting}
              className="w-full max-w-sm py-5 text-black font-bold text-lg rounded-2xl flex items-center justify-center gap-3 disabled:opacity-60"
              style={{ backgroundColor: A }}>
              {starting ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
              Comenzar
            </button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            {todayExercises.map((re: any) => (
              <ExerciseCard
                key={re.id}
                re={re}
                lastSets={lastPerf[re.exercise_id]}
                sets={exerciseSets[re.exercise_id] ?? []}
                onSetUpdate={(i: number, upd: any) => updateSet(re.exercise_id, i, upd)}
                onSetComplete={(i: number) => completeSet(re.exercise_id, i)}
                onAddSet={() => addSet(re.exercise_id)}
              />
            ))}
            <button onClick={finishWorkout} disabled={finishing}
              className="w-full py-4 text-black font-bold rounded-2xl flex items-center justify-center gap-2 mt-4 mb-8 disabled:opacity-60"
              style={{ backgroundColor: A }}>
              {finishing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Finalizar entrenamiento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function DashboardClient({ userId, routine, todayDay, todayExercises, lastPerf, recentSessions, lastSession, weeklyVolume }: any) {
  const [workoutOpen, setWorkoutOpen] = useState(false)
  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const hasToday = todayDay && todayExercises.length > 0

  // Last session highlight
  const lastHighlight = (() => {
    if (!lastSession?.workout_sets?.length) return null
    const byEx: Record<string, any[]> = {}
    for (const s of lastSession.workout_sets) {
      if (!byEx[s.exercise?.name ?? s.exercise_id]) byEx[s.exercise?.name ?? s.exercise_id] = []
      byEx[s.exercise?.name ?? s.exercise_id].push(s)
    }
    const [exName, sets] = Object.entries(byEx)[0] ?? []
    if (!exName || !sets?.length) return null
    const maxW = Math.max(...(sets as any[]).map((s: any) => s.weight_kg ?? 0))
    const totalReps = (sets as any[]).reduce((a: number, s: any) => a + (s.reps ?? 0), 0)
    return { exName, maxW, sets: sets.length, totalReps }
  })()

  return (
    <>
      {workoutOpen && hasToday && (
        <QuickWorkout
          userId={userId}
          routine={routine}
          todayDay={todayDay}
          todayExercises={todayExercises}
          lastPerf={lastPerf}
          onClose={() => setWorkoutOpen(false)}
        />
      )}

      <div className="p-5 md:p-8 max-w-2xl mx-auto">
        {/* Greeting */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: MUT }}>
            {getDayName(today.getDay())}, {format(today, "d 'de' MMMM", { locale: es })}
          </p>
          <h1 className="font-display text-3xl font-semibold">{greeting} 👋</h1>
        </div>

        {/* TODAY CARD + BIG CTA */}
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
          {hasToday ? (
            <>
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs uppercase tracking-widest" style={{ color: A }}>Hoy · {getDayName(today.getDay(), true)}</span>
                    <h2 className="font-display text-xl font-semibold mt-0.5">{todayDay.day_label ?? routine?.name}</h2>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(201,168,76,0.12)', color: A }}>
                    {todayExercises.length} ejercicios
                  </span>
                </div>

                {/* Exercise preview with last perf */}
                <div className="space-y-2 mb-4">
                  {todayExercises.slice(0, 3).map((re: any) => {
                    const prev = lastPerf[re.exercise_id]?.[0]
                    return (
                      <div key={re.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ backgroundColor: ELEV }}>
                        <span className="text-lg">{getMuscleEmoji(re.exercise?.muscle_group)}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{re.exercise?.name}</span>
                          <span className="text-xs" style={{ color: MUT }}>{re.target_sets} × {re.target_reps}</span>
                        </div>
                        {prev && (
                          <span className="text-xs flex-shrink-0 font-semibold" style={{ color: A }}>
                            {prev.weight_kg}kg × {prev.reps}
                          </span>
                        )}
                      </div>
                    )
                  })}
                  {todayExercises.length > 3 && (
                    <p className="text-xs text-center py-1" style={{ color: MUT }}>
                      +{todayExercises.length - 3} ejercicios más
                    </p>
                  )}
                </div>
              </div>

              {/* BIG CTA */}
              <button
                onClick={() => setWorkoutOpen(true)}
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
                  <p className="text-2xl mb-2">😴</p>
                  <p className="font-semibold mb-1">Día de descanso</p>
                  <p className="text-sm" style={{ color: MUT }}>Aprovecha para recuperarte. Vuelves mañana.</p>
                </>
              ) : (
                <>
                  <p className="text-2xl mb-2">📋</p>
                  <p className="font-semibold mb-3">Sin rutina activa</p>
                  <Link href="/routines/new"
                    className="inline-flex px-5 py-2.5 text-black font-semibold text-sm rounded-xl"
                    style={{ backgroundColor: A }}>
                    Crear Rutina
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* Last session highlight */}
        {lastHighlight && (
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-4"
            style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(201,168,76,0.1)' }}>
              <TrendingUp size={18} style={{ color: A }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: MUT }}>Última sesión</p>
              <p className="text-sm font-semibold truncate">
                {lastHighlight.exName}: <span style={{ color: A }}>{lastHighlight.maxW}kg</span>
                <span style={{ color: MUT }}> · {lastHighlight.sets} series</span>
              </p>
            </div>
            <Link href="/history" style={{ color: MUT }}>
              <ChevronRight size={16} />
            </Link>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl p-4" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={13} style={{ color: A }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: MUT }}>Volumen semanal</span>
            </div>
            <p className="text-xl font-bold">
              {weeklyVolume > 0 ? `${(weeklyVolume / 1000).toFixed(1)}t` : '—'}
            </p>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={13} style={{ color: A }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: MUT }}>Última sesión</span>
            </div>
            <p className="text-xl font-bold">
              {lastSession?.finished_at
                ? format(new Date(lastSession.finished_at), "d MMM", { locale: es })
                : '—'}
            </p>
          </div>
        </div>

        {/* Recent sessions */}
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
                const vol = s.workout_sets?.reduce((a: number, x: any) => a + (x.weight_kg ?? 0) * (x.reps ?? 0), 0) ?? 0
                return (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
                    <div>
                      <div className="text-sm font-medium">{s.routine?.name ?? 'Sesión libre'}</div>
                      <div className="text-xs mt-0.5" style={{ color: MUT }}>
                        {s.finished_at ? format(new Date(s.finished_at), "d MMM · HH:mm", { locale: es }) : '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={{ color: A }}>
                        {vol > 0 ? `${vol.toLocaleString()} kg` : '—'}
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
