'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Play, Pause, RotateCcw, Settings, Check, ChevronLeft, Plus, Minus, X } from 'lucide-react'
import Link from 'next/link'

const A    = 'rgb(var(--accent))'
const SURF = 'rgb(var(--bg-surface))'
const ELEV = 'rgb(var(--bg-elevated))'
const BORD = 'rgb(var(--border))'
const MUT  = 'rgb(var(--muted))'
const FG   = 'rgb(var(--foreground))'

// ── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = [
  { name: 'Tabata',   work: 20, rest: 10, rounds: 8  },
  { name: 'HIIT',     work: 30, rest: 30, rounds: 6  },
  { name: 'EMOM',     work: 50, rest: 10, rounds: 10 },
  { name: 'Pirámide', work: 40, rest: 20, rounds: 5  },
  { name: 'Custom',   work: 0,  rest: 0,  rounds: 0  },
]

// ── Web Audio beep ────────────────────────────────────────────────────────────
function useBeep() {
  const ctx = useRef<AudioContext | null>(null)
  return useCallback((freq = 880, dur = 0.15, vol = 0.5) => {
    try {
      if (!ctx.current) ctx.current = new AudioContext()
      const o = ctx.current.createOscillator()
      const g = ctx.current.createGain()
      o.connect(g); g.connect(ctx.current.destination)
      o.frequency.value = freq
      g.gain.setValueAtTime(vol, ctx.current.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.current.currentTime + dur)
      o.start(); o.stop(ctx.current.currentTime + dur)
    } catch {}
  }, [])
}

// ── Number Stepper ────────────────────────────────────────────────────────────
function Stepper({ label, value, min, max, step = 5, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm" style={{ color: MUT }}>{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg transition-colors"
          style={{ backgroundColor: ELEV, color: MUT }}>
          <Minus size={14} />
        </button>
        <span className="w-12 text-center font-bold text-xl tabular-nums">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg transition-colors"
          style={{ backgroundColor: ELEV, color: A }}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Post-workout log modal ────────────────────────────────────────────────────
function LogModal({ onSave, onSkip }: { onSave: (text: string) => void; onSkip: () => void }) {
  const [text, setText] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-3xl p-6"
        style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold">🎉 ¡Sesión completada!</h3>
          <button onClick={onSkip} style={{ color: MUT }}><X size={18} /></button>
        </div>
        <p className="text-sm mb-4" style={{ color: MUT }}>
          ¿Qué ejercicios hiciste? (opcional)
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Ej: Burpees, mountain climbers, saltos…"
          rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none mb-4"
          style={{ backgroundColor: ELEV, border: `1px solid ${BORD}`, color: FG }}
        />
        <div className="flex gap-3">
          <button onClick={onSkip}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: ELEV, color: MUT }}>
            Saltar
          </button>
          <button onClick={() => onSave(text)}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-black"
            style={{ backgroundColor: A }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main HIITClient ───────────────────────────────────────────────────────────
export function HIITClient({ userId }: { userId?: string }) {
  const beep  = useBeep()
  const supabase = createClient()

  // Config state
  const [config, setConfig] = useState({ work: 20, rest: 10, rounds: 8 })
  const [activePreset, setActivePreset] = useState('Tabata')
  const [showConfig, setShowConfig] = useState(false)
  const [showLog, setShowLog] = useState(false)

  // ── Timer state — all in refs to avoid stale closures ──────────────────────
  // We keep ONE source of truth: a ref-based state machine.
  // React state is only used for re-renders.
  type Phase = 'idle' | 'work' | 'rest' | 'done'

  const phaseRef   = useRef<Phase>('idle')
  const roundRef   = useRef(1)
  const leftRef    = useRef(config.work)
  const runningRef = useRef(false)
  const configRef  = useRef(config)
  const tickRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  // Mirror to state for render
  const [phase,   setPhaseS]   = useState<Phase>('idle')
  const [round,   setRoundS]   = useState(1)
  const [left,    setLeftS]    = useState(config.work)
  const [running, setRunningS] = useState(false)
  const [totalElapsed, setTotalElapsed] = useState(0)

  // Keep configRef in sync
  useEffect(() => { configRef.current = config }, [config])

  // ── Core tick ──────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (!runningRef.current) return
    const cfg = configRef.current

    leftRef.current -= 1
    setTotalElapsed(e => e + 1)

    // Countdown beeps
    if (leftRef.current > 0 && leftRef.current <= 3) {
      beep(440, 0.08, 0.25)
    }

    if (leftRef.current <= 0) {
      // Phase transition
      if (phaseRef.current === 'work') {
        // work → rest
        beep(330, 0.25, 0.5)
        phaseRef.current = 'rest'
        leftRef.current  = cfg.rest
        setPhaseS('rest')
        setLeftS(cfg.rest)

      } else if (phaseRef.current === 'rest') {
        // rest → next round or done
        const nextRound = roundRef.current + 1

        if (roundRef.current >= cfg.rounds) {
          // All done
          phaseRef.current = 'done'
          runningRef.current = false
          if (tickRef.current) clearInterval(tickRef.current)
          beep(660, 0.2, 0.5)
          setTimeout(() => beep(880, 0.3, 0.5), 250)
          setTimeout(() => beep(1100, 0.5, 0.6), 500)
          setPhaseS('done')
          setRunningS(false)
          setTimeout(() => setShowLog(true), 800)
        } else {
          // Next round
          beep(660, 0.15, 0.4)
          roundRef.current  = nextRound
          phaseRef.current  = 'work'
          leftRef.current   = cfg.work
          setRoundS(nextRound)
          setPhaseS('work')
          setLeftS(cfg.work)
        }
      }
    } else {
      setLeftS(leftRef.current)
    }
  }, [beep])

  // ── Start / pause / reset ──────────────────────────────────────────────────
  const start = useCallback(() => {
    if (phaseRef.current === 'idle') {
      phaseRef.current  = 'work'
      leftRef.current   = configRef.current.work
      roundRef.current  = 1
      setPhaseS('work')
      setLeftS(configRef.current.work)
      setRoundS(1)
      setTotalElapsed(0)
    }
    runningRef.current = true
    setRunningS(true)
    beep(880, 0.12, 0.4)
    tickRef.current = setInterval(tick, 1000)
  }, [tick, beep])

  const pause = useCallback(() => {
    runningRef.current = false
    setRunningS(false)
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }, [])

  const reset = useCallback(() => {
    pause()
    phaseRef.current  = 'idle'
    roundRef.current  = 1
    leftRef.current   = configRef.current.work
    setPhaseS('idle')
    setRoundS(1)
    setLeftS(configRef.current.work)
    setTotalElapsed(0)
    setShowLog(false)
  }, [pause])

  // Cleanup on unmount
  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current) }, [])

  // Apply preset
  const applyPreset = (preset: typeof PRESETS[number]) => {
    if (preset.name === 'Custom') { setShowConfig(true); return }
    const c = { work: preset.work, rest: preset.rest, rounds: preset.rounds }
    setConfig(c)
    setActivePreset(preset.name)
    reset()
  }

  // Save session log
  const saveLog = async (text: string) => {
    if (userId && text.trim()) {
      await supabase.from('workout_sessions').insert({
        user_id: userId,
        status: 'completed',
        notes: text,
        started_at: new Date(Date.now() - totalElapsed * 1000).toISOString(),
        finished_at: new Date().toISOString(),
      })
    }
    setShowLog(false)
  }

  // ── Derived visuals ────────────────────────────────────────────────────────
  const RING_R    = 90
  const RING_CIRC = 2 * Math.PI * RING_R
  const segMax    = phase === 'work' ? config.work : phase === 'rest' ? config.rest : 1
  const segPct    = segMax > 0 ? Math.max(0, left / segMax) : 0
  const ringDash  = segPct * RING_CIRC
  const ringColor = phase === 'work' ? '#e74c3c' : phase === 'rest' ? '#27ae60' : A

  const totalTime  = config.rounds * (config.work + config.rest)
  const overallPct = totalTime > 0 ? Math.min(100, Math.round((totalElapsed / totalTime) * 100)) : 0

  const phaseLabel = { idle: 'Listo', work: '¡Trabaja!', rest: 'Descansa', done: '¡Hecho!' }[phase]
  const phaseColor = phase === 'work' ? '#e74c3c' : phase === 'rest' ? '#27ae60' : MUT

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'rgb(var(--bg-primary))' }}>

      {showLog && <LogModal onSave={saveLog} onSkip={() => setShowLog(false)} />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ backgroundColor: SURF, borderBottom: `1px solid ${BORD}` }}>
        <Link href="/dashboard" className="flex items-center gap-2 text-sm" style={{ color: MUT }}>
          <ChevronLeft size={16} /> Inicio
        </Link>
        <h1 className="font-display text-lg font-semibold">HIIT / Tabata</h1>
        <button
          onClick={() => { setShowConfig(s => !s); if (running) pause() }}
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: showConfig ? 'rgba(201,168,76,0.15)' : ELEV, color: showConfig ? A : MUT, border: `1px solid ${showConfig ? A : BORD}` }}>
          <Settings size={15} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center px-5 pt-5 pb-10 max-w-md mx-auto w-full">

        {/* ── Preset selector ── */}
        <div className="grid grid-cols-5 gap-1.5 w-full mb-5">
          {PRESETS.map(p => {
            const isActive = p.name === 'Custom' ? showConfig : activePreset === p.name && !showConfig
            return (
              <button key={p.name} onClick={() => applyPreset(p)}
                className="flex flex-col items-center py-2 rounded-xl text-[11px] font-semibold transition-all"
                style={{
                  backgroundColor: isActive ? 'rgba(201,168,76,0.12)' : ELEV,
                  border: `1.5px solid ${isActive ? A : BORD}`,
                  color: isActive ? A : MUT,
                }}>
                <span>{p.name}</span>
                {p.name !== 'Custom' && (
                  <span className="font-normal opacity-60 mt-0.5 text-[9px]">{p.work}/{p.rest}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Config panel ── */}
        {showConfig && (
          <div className="w-full rounded-2xl p-5 mb-5" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
            <h3 className="text-sm font-semibold mb-3">Configuración personalizada</h3>
            <Stepper label="Trabajo (s)"   value={config.work}   min={5}  max={300} step={5}  onChange={v => setConfig(c => ({ ...c, work: v }))} />
            <Stepper label="Descanso (s)"  value={config.rest}   min={0}  max={300} step={5}  onChange={v => setConfig(c => ({ ...c, rest: v }))} />
            <Stepper label="Rondas"        value={config.rounds} min={1}  max={50}  step={1}  onChange={v => setConfig(c => ({ ...c, rounds: v }))} />
            <div className="mt-4 pt-3 flex justify-between text-xs" style={{ borderTop: `1px solid ${BORD}`, color: MUT }}>
              <span>Total: {Math.round(config.rounds * (config.work + config.rest) / 60)} min</span>
              <button onClick={() => { setActivePreset('Custom'); setShowConfig(false); reset() }}
                className="font-bold px-4 py-2 rounded-xl text-black"
                style={{ backgroundColor: A }}>
                Aplicar
              </button>
            </div>
          </div>
        )}

        {/* ── Stats row ── */}
        <div className="flex gap-3 w-full mb-6">
          {[
            { label: 'Trabajo', value: `${config.work}s`, color: '#e74c3c' },
            { label: 'Descanso', value: `${config.rest}s`, color: '#27ae60' },
            { label: 'Ronda', value: `${round}/${config.rounds}`, color: A },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 text-center px-2 py-3 rounded-xl"
              style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
              <div className="text-lg font-bold tabular-nums" style={{ color }}>{value}</div>
              <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: MUT }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Big ring ── */}
        <div className="relative mb-6" style={{ width: 224, height: 224 }}>
          <svg width={224} height={224} className="-rotate-90" viewBox="0 0 224 224">
            <circle cx={112} cy={112} r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={14} />
            <circle cx={112} cy={112} r={RING_R} fill="none" stroke={ringColor} strokeWidth={14}
              strokeDasharray={`${ringDash} ${RING_CIRC}`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.95s linear, stroke 0.4s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <span className="text-[11px] uppercase tracking-widest font-semibold mb-1"
              style={{ color: phaseColor }}>{phaseLabel}</span>
            <span className="font-display font-bold tabular-nums leading-none"
              style={{ fontSize: 80, color: FG }}>
              {phase === 'idle' ? config.work : left}
            </span>
            {phase !== 'idle' && phase !== 'done' && (
              <span className="text-xs mt-1" style={{ color: MUT }}>segundos</span>
            )}
          </div>
        </div>

        {/* ── Overall progress bar ── */}
        {phase !== 'idle' && (
          <div className="w-full mb-6">
            <div className="flex justify-between text-[10px] mb-1.5" style={{ color: MUT }}>
              <span>Progreso total</span>
              <span>{overallPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${overallPct}%`, backgroundColor: A }} />
            </div>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="flex gap-3 w-full mb-6">
          <button onClick={reset}
            className="w-14 h-14 flex items-center justify-center rounded-2xl flex-shrink-0"
            style={{ backgroundColor: ELEV, color: MUT }}>
            <RotateCcw size={20} />
          </button>
          <button
            onClick={phase === 'done' ? reset : running ? pause : start}
            className="flex-1 h-14 flex items-center justify-center gap-3 rounded-2xl text-black font-bold text-lg active:scale-95 transition-transform"
            style={{ backgroundColor: A }}>
            {phase === 'done'
              ? <><RotateCcw size={18} /> Repetir</>
              : running
              ? <><Pause size={20} /> Pausar</>
              : <><Play size={20} /> {phase === 'idle' ? 'Comenzar' : 'Continuar'}</>}
          </button>
        </div>

        {/* ── Round dots ── */}
        <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
          {Array.from({ length: config.rounds }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  i < round - 1    ? A
                  : i === round - 1 ? (phase === 'work' ? '#e74c3c' : phase === 'rest' ? '#27ae60' : A)
                  : 'rgba(255,255,255,0.08)'
              }} />
          ))}
        </div>
      </div>
    </div>
  )
}
