'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMuscleEmoji, formatDuration, calculateE1RM } from '@/lib/utils'
import { Play, Check, X, Plus, ChevronDown, ChevronUp, Loader2, Timer, Volume2, VolumeX } from 'lucide-react'

// ── Colours ──────────────────────────────────────────────────────────────────
const A = 'rgb(var(--accent))'
const SURF = 'rgb(var(--bg-surface))'
const ELEV = 'rgb(var(--bg-elevated))'
const BORD = 'rgb(var(--border))'
const MUT = 'rgb(var(--muted))'
const FG = 'rgb(var(--foreground))'
const DANGER = 'rgb(var(--danger))'
const SUCCESS = 'rgb(var(--success))'

// ── Beep via Web Audio API ────────────────────────────────────────────────────
function useBeep() {
  const ctx = useRef<AudioContext | null>(null)
  const play = useCallback((freq = 880, duration = 0.15, vol = 0.4) => {
    try {
      if (!ctx.current) ctx.current = new AudioContext()
      const osc = ctx.current.createOscillator()
      const gain = ctx.current.createGain()
      osc.connect(gain); gain.connect(ctx.current.destination)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(vol, ctx.current.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.current.currentTime + duration)
      osc.start(); osc.stop(ctx.current.currentTime + duration)
    } catch {}
  }, [])
  return play
}

// ── Rest Timer overlay ────────────────────────────────────────────────────────
function RestTimer({ seconds, presets, onDone, onSkip, muted }: {
  seconds: number; presets: number[]; onDone: () => void; onSkip: () => void; muted: boolean
}) {
  const [left, setLeft] = useState(seconds)
  const [total, setTotal] = useState(seconds)
  const beep = useBeep()

  useEffect(() => {
    setLeft(seconds); setTotal(seconds)
  }, [seconds])

  useEffect(() => {
    if (left <= 0) { onDone(); return }
    if (!muted && left <= 3) beep(660, 0.1, 0.3)
    const t = setTimeout(() => setLeft(l => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  useEffect(() => {
    if (!muted && left === 0) { beep(880, 0.3, 0.5); setTimeout(() => beep(880, 0.3, 0.5), 350) }
  }, [left])

  const pct = total > 0 ? (left / total) * 100 : 0
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  const addTime = (s: number) => setLeft(l => Math.max(0, l + s))

  return (
    <div className="fixed inset-0 z-60 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: 'rgba(9,9,9,0.92)', backdropFilter: 'blur(8px)' }}>
      <p className="text-xs uppercase tracking-widest mb-6" style={{ color: MUT }}>Descanso</p>
      {/* Ring */}
      <div className="relative w-36 h-36 mb-6">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(42,42,42)" strokeWidth="8" />
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(201,168,76)" strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.9s linear' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-5xl font-bold" style={{ color: A }}>{left}</span>
        </div>
      </div>

      {/* Preset adjustments */}
      <div className="flex gap-2 mb-6">
        {[-15, -10, +10, +15].map(d => (
          <button key={d} onClick={() => addTime(d)}
            className="px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: ELEV, color: d > 0 ? A : MUT }}>
            {d > 0 ? `+${d}s` : `${d}s`}
          </button>
        ))}
      </div>

      {/* Quick presets */}
      <div className="flex gap-2 mb-8">
        {presets.map(p => (
          <button key={p} onClick={() => { setLeft(p); setTotal(p) }}
            className="px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ backgroundColor: left === p ? A : ELEV, color: left === p ? 'black' : MUT }}>
            {p}s
          </button>
        ))}
      </div>

      <button onClick={onSkip}
        className="px-8 py-3 rounded-2xl font-semibold text-sm flex items-center gap-2"
        style={{ backgroundColor: ELEV, color: MUT }}>
        <X size={15} /> Saltar descanso
      </button>
    </div>
  )
}

// ── Set Row ───────────────────────────────────────────────────────────────────
function SetRow({ set, idx, onUpdate, onComplete, isWarmup }: any) {
  const e1rm = set.done && set.kg > 0 && set.reps > 0 ? calculateE1RM(set.kg, set.reps) : null
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex flex-col items-center w-5 flex-shrink-0">
        <span className="text-xs font-bold" style={{ color: set.done ? A : MUT }}>{idx + 1}</span>
        {isWarmup && <span className="text-[9px]" style={{ color: MUT }}>C</span>}
      </div>

      <input type="number" inputMode="decimal" value={set.kg || ''}
        onChange={e => onUpdate({ kg: parseFloat(e.target.value) || 0 })}
        placeholder="kg"
        className="w-[60px] py-2.5 text-center text-sm font-bold rounded-xl focus:outline-none"
        style={{ backgroundColor: set.done ? 'rgba(201,168,76,0.08)' : 'rgb(var(--bg-input))', border: `1.5px solid ${set.done ? A : BORD}`, color: FG }} />

      <span className="text-xs flex-shrink-0" style={{ color: MUT }}>×</span>

      <input type="number" inputMode="numeric" value={set.reps || ''}
        onChange={e => onUpdate({ reps: parseInt(e.target.value) || 0 })}
        placeholder="reps"
        className="w-[60px] py-2.5 text-center text-sm font-bold rounded-xl focus:outline-none"
        style={{ backgroundColor: set.done ? 'rgba(201,168,76,0.08)' : 'rgb(var(--bg-input))', border: `1.5px solid ${set.done ? A : BORD}`, color: FG }} />

      {e1rm && (
        <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: MUT }}>
          ~{e1rm}kg
        </span>
      )}

      <button onClick={() => onComplete()} disabled={set.done}
        className="ml-auto w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-50 active:scale-95"
        style={{
          backgroundColor: set.done ? 'rgba(201,168,76,0.15)' : ELEV,
          color: set.done ? A : MUT,
          border: `1.5px solid ${set.done ? A : BORD}`
        }}>
        <Check size={16} strokeWidth={2.5} />
      </button>
    </div>
  )
}

// ── Exercise Card ─────────────────────────────────────────────────────────────
function ExerciseCard({ re, lastSets, sets, onSetUpdate, onSetComplete, onAddSet, isActive }: any) {
  const [open, setOpen] = useState(isActive)
  const done = sets.filter((s: any) => s.done).length
  const allDone = done === sets.length && sets.length > 0
  const lastBest = lastSets?.[0]
  const best1RM = lastBest ? calculateE1RM(lastBest.weight_kg, lastBest.reps) : null

  return (
    <div className="rounded-2xl overflow-hidden mb-3 transition-all"
      style={{ border: `1.5px solid ${allDone ? A : open ? 'rgba(201,168,76,0.3)' : BORD}`, backgroundColor: SURF }}>

      {/* Header */}
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: allDone ? 'rgba(201,168,76,0.15)' : ELEV }}>
          {getMuscleEmoji(re.exercise?.muscle_group)}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="font-semibold text-sm truncate">{re.exercise?.name}</div>
          <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: MUT }}>
            <span style={{ color: done > 0 ? A : MUT }}>{done}/{sets.length} series</span>
            {best1RM && <span>· 1RM est: {best1RM}kg</span>}
          </div>
        </div>
        {allDone
          ? <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(201,168,76,0.15)', color: A }}>
              <Check size={14} strokeWidth={2.5} />
            </span>
          : open ? <ChevronUp size={15} style={{ color: MUT }} /> : <ChevronDown size={15} style={{ color: MUT }} />
        }
      </button>

      {/* Sets */}
      {open && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${BORD}` }}>
          {lastBest && (
            <div className="flex items-center justify-between py-2 mb-1">
              <span className="text-xs" style={{ color: MUT }}>Última vez:</span>
              <span className="text-xs font-semibold" style={{ color: A }}>
                {lastBest.weight_kg}kg × {lastBest.reps} reps
              </span>
            </div>
          )}
          <div>
            {sets.map((s: any, i: number) => (
              <SetRow key={i} set={s} idx={i} isWarmup={i === 0 && sets.length > 2}
                onUpdate={(u: any) => onSetUpdate(i, u)}
                onComplete={() => onSetComplete(i)} />
            ))}
          </div>
          <button onClick={onAddSet}
            className="flex items-center gap-2 mt-2 text-xs py-2.5 w-full justify-center rounded-xl transition-colors"
            style={{ color: MUT, border: `1px dashed ${BORD}` }}>
            <Plus size={12} /> Añadir serie
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main QuickWorkout ─────────────────────────────────────────────────────────
export function QuickWorkout({ userId, routine, todayDay, todayExercises, lastPerf, onClose }: any) {
  const router = useRouter()
  const supabase = createClient()
  const beep = useBeep()

  const [phase, setPhase] = useState<'preview' | 'active'>('preview')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [muted, setMuted] = useState(false)
  const [restActive, setRestActive] = useState(false)
  const [restSeconds, setRestSeconds] = useState(90)
  const [activeExIdx, setActiveExIdx] = useState(0)

  const REST_PRESETS = [30, 60, 90, 120]

  const [exerciseSets, setExerciseSets] = useState<Record<string, any[]>>(() => {
    const init: Record<string, any[]> = {}
    for (const re of todayExercises) {
      const prev = (lastPerf[re.exercise_id] ?? []) as any[]
      const count = re.target_sets ?? 3
      init[re.exercise_id] = Array.from({ length: count }, (_, i) => ({
        kg: prev[i]?.weight_kg ?? (prev[0]?.weight_kg ?? 0),
        reps: prev[i]?.reps ?? (re.target_reps ? parseInt(re.target_reps) || 0 : 0),
        done: false,
      }))
    }
    return init
  })

  // Elapsed timer
  useEffect(() => {
    if (phase !== 'active') return
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  const totalDone = todayExercises.reduce((a: number, re: any) =>
    a + (exerciseSets[re.exercise_id]?.filter((s: any) => s.done).length ?? 0), 0)
  const totalSets = todayExercises.reduce((a: number, re: any) =>
    a + (exerciseSets[re.exercise_id]?.length ?? 0), 0)

  const startSession = async () => {
    setStarting(true)
    const { data } = await supabase.from('workout_sessions').insert({
      user_id: userId,
      routine_id: routine?.id ?? null,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }).select().single()
    if (data) { setSessionId((data as any).id); setPhase('active') }
    setStarting(false)
  }

  const updateSet = (exId: string, idx: number, upd: any) =>
    setExerciseSets(p => ({ ...p, [exId]: p[exId].map((s, i) => i === idx ? { ...s, ...upd } : s) }))

  const completeSet = (exId: string, idx: number) => {
    setExerciseSets(p => ({ ...p, [exId]: p[exId].map((s, i) => i === idx ? { ...s, done: true } : s) }))
    if (!muted) beep(660, 0.12, 0.3)
    setRestActive(true)
    // Advance to next exercise if all sets done
    const allDone = (exerciseSets[exId] ?? []).every((s, i) => i === idx || s.done)
    if (allDone) {
      const nextIdx = todayExercises.findIndex((re: any, i: number) => i > activeExIdx)
      if (nextIdx !== -1) setActiveExIdx(nextIdx)
    }
  }

  const addSet = (exId: string) =>
    setExerciseSets(p => {
      const last = p[exId]?.slice(-1)[0]
      return { ...p, [exId]: [...(p[exId] ?? []), { kg: last?.kg ?? 0, reps: last?.reps ?? 0, done: false }] }
    })

  const finishWorkout = async () => {
    if (!sessionId) return
    setFinishing(true)
    for (const re of todayExercises) {
      const sets = exerciseSets[re.exercise_id] ?? []
      for (let i = 0; i < sets.length; i++) {
        const s = sets[i]
        if (s.kg === 0 && s.reps === 0 && !s.done) continue
        await supabase.from('workout_sets').insert({
          session_id: sessionId, exercise_id: re.exercise_id,
          set_number: i + 1, weight_kg: s.kg || null, reps: s.reps || null,
          is_warmup: false, completed_at: new Date().toISOString(),
        })
      }
    }
    await supabase.from('workout_sessions').update({
      status: 'completed', finished_at: new Date().toISOString()
    }).eq('id', sessionId)
    if (!muted) { beep(440, 0.3, 0.4); setTimeout(() => beep(550, 0.3, 0.4), 300); setTimeout(() => beep(660, 0.5, 0.5), 600) }
    router.refresh()
    onClose()
  }

  const pct = totalSets > 0 ? Math.round((totalDone / totalSets) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgb(var(--bg-primary))' }}>
      {/* Rest Timer */}
      {restActive && phase === 'active' && (
        <RestTimer seconds={restSeconds} presets={REST_PRESETS} muted={muted}
          onDone={() => setRestActive(false)}
          onSkip={() => setRestActive(false)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 gap-3"
        style={{ backgroundColor: SURF, borderBottom: `1px solid ${BORD}` }}>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-lg font-semibold truncate">
            {todayDay?.day_label ?? routine?.name ?? 'Entrenamiento'}
          </h2>
          {phase === 'active' && (
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs font-semibold" style={{ color: A }}>{formatDuration(elapsed)}</span>
              <span className="text-xs" style={{ color: MUT }}>{totalDone}/{totalSets} series · {pct}%</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Rest time selector */}
          {phase === 'active' && (
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl"
              style={{ backgroundColor: ELEV, border: `1px solid ${BORD}` }}>
              <Timer size={12} style={{ color: MUT }} />
              <select value={restSeconds} onChange={e => setRestSeconds(Number(e.target.value))}
                className="text-xs font-semibold bg-transparent focus:outline-none"
                style={{ color: A }}>
                {REST_PRESETS.map(p => <option key={p} value={p}>{p}s</option>)}
              </select>
            </div>
          )}

          <button onClick={() => setMuted(m => !m)}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: ELEV, color: muted ? MUT : A }}>
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          {phase === 'active' && (
            <button onClick={finishWorkout} disabled={finishing}
              className="px-4 py-2 text-black font-bold text-sm rounded-xl flex items-center gap-1.5 disabled:opacity-60"
              style={{ backgroundColor: A }}>
              {finishing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
              Fin
            </button>
          )}
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: ELEV, color: MUT }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {phase === 'active' && (
        <div className="h-1 flex-shrink-0" style={{ backgroundColor: BORD }}>
          <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: A }} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {phase === 'preview' ? (
          <div className="flex flex-col items-center justify-center min-h-full text-center px-6 py-10">
            <div className="text-5xl mb-4">🏋️</div>
            <h3 className="font-display text-2xl font-semibold mb-2">
              {todayDay?.day_label ?? 'Entrenamiento de hoy'}
            </h3>
            <p className="text-sm mb-6" style={{ color: MUT }}>
              {todayExercises.length} ejercicios · {totalSets} series
            </p>

            {/* Exercise preview */}
            <div className="w-full max-w-sm mb-8 space-y-2">
              {todayExercises.map((re: any) => {
                const prev = lastPerf[re.exercise_id]?.[0]
                return (
                  <div key={re.id} className="flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                    style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
                    <span className="text-xl">{getMuscleEmoji(re.exercise?.muscle_group)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{re.exercise?.name}</div>
                      <div className="text-xs" style={{ color: MUT }}>{re.target_sets} × {re.target_reps}</div>
                    </div>
                    {prev && (
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: A }}>
                        {prev.weight_kg}kg
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <button onClick={startSession} disabled={starting}
              className="w-full max-w-sm py-5 text-black font-bold text-xl rounded-2xl flex items-center justify-center gap-3 disabled:opacity-60 active:scale-95 transition-transform"
              style={{ backgroundColor: A }}>
              {starting ? <Loader2 size={22} className="animate-spin" /> : <Play size={22} strokeWidth={2.5} />}
              Comenzar
            </button>
          </div>
        ) : (
          <div className="px-4 pt-4 pb-24 max-w-lg mx-auto">
            {todayExercises.map((re: any, idx: number) => (
              <ExerciseCard key={re.id} re={re}
                lastSets={lastPerf[re.exercise_id]}
                sets={exerciseSets[re.exercise_id] ?? []}
                isActive={idx === activeExIdx}
                onSetUpdate={(i: number, u: any) => updateSet(re.exercise_id, i, u)}
                onSetComplete={(i: number) => completeSet(re.exercise_id, i)}
                onAddSet={() => addSet(re.exercise_id)} />
            ))}

            {/* Finish button */}
            <button onClick={finishWorkout} disabled={finishing}
              className="w-full py-4 text-black font-bold rounded-2xl flex items-center justify-center gap-2 mt-2 disabled:opacity-60 active:scale-95 transition-transform"
              style={{ backgroundColor: A }}>
              {finishing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
              Finalizar entrenamiento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
