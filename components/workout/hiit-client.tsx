'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Settings, Check, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

const A = 'rgb(var(--accent))'
const SURF = 'rgb(var(--bg-surface))'
const ELEV = 'rgb(var(--bg-elevated))'
const BORD = 'rgb(var(--border))'
const MUT = 'rgb(var(--muted))'
const FG = 'rgb(var(--foreground))'

const PRESETS = [
  { name: 'Tabata', work: 20, rest: 10, rounds: 8, color: '#e74c3c' },
  { name: 'HIIT', work: 30, rest: 30, rounds: 6, color: '#e67e22' },
  { name: 'EMOM', work: 50, rest: 10, rounds: 10, color: '#8e44ad' },
  { name: 'Pirámide', work: 40, rest: 20, rounds: 5, color: '#27ae60' },
]

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

type Phase = 'idle' | 'work' | 'rest' | 'done'

export function HIITClient() {
  const beep = useBeep()
  const [config, setConfig] = useState({ work: 20, rest: 10, rounds: 8 })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(config)
  const [phase, setPhase] = useState<Phase>('idle')
  const [round, setRound] = useState(1)
  const [left, setLeft] = useState(config.work)
  const [running, setRunning] = useState(false)
  const [totalElapsed, setTotalElapsed] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const totalTime = config.rounds * (config.work + config.rest)

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false); setPhase('idle'); setRound(1)
    setLeft(config.work); setTotalElapsed(0)
  }

  useEffect(() => { reset() }, [config])

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return }

    intervalRef.current = setInterval(() => {
      setLeft(l => {
        if (l <= 1) {
          // transition
          setPhase(p => {
            if (p === 'work') {
              beep(440, 0.2, 0.5)
              return 'rest'
            } else {
              // rest ended
              setRound(r => {
                if (r >= config.rounds) {
                  setRunning(false)
                  beep(880, 0.3, 0.6); setTimeout(() => beep(1100, 0.5, 0.6), 350)
                  return r
                }
                beep(660, 0.15, 0.4)
                return r + 1
              })
              return 'work'
            }
          })
          return p => p === 'work' ? config.rest : config.work
        }
        if (l <= 4) beep(440, 0.08, 0.2)
        return l - 1
      })
      setTotalElapsed(e => e + 1)
    }, 1000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, config])

  // Fix: left setter inside interval can't see updated phase, use callback
  const [nextLeft, setNextLeft] = useState<number | null>(null)
  useEffect(() => { if (nextLeft !== null) { setLeft(nextLeft); setNextLeft(null) } }, [nextLeft])

  const start = () => {
    if (phase === 'idle') setPhase('work')
    setRunning(true)
  }

  const progress = phase === 'idle' ? 0
    : phase === 'done' ? 100
    : Math.round((totalElapsed / totalTime) * 100)

  const ringColor = phase === 'work' ? '#e74c3c' : phase === 'rest' ? '#27ae60' : A
  const R = 90
  const circ = 2 * Math.PI * R
  const segMax = phase === 'work' ? config.work : config.rest
  const segPct = segMax > 0 ? (left / segMax) : 0
  const dash = segPct * circ

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'rgb(var(--bg-primary))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ backgroundColor: SURF, borderBottom: `1px solid ${BORD}` }}>
        <Link href="/dashboard" className="flex items-center gap-2 text-sm" style={{ color: MUT }}>
          <ChevronLeft size={16} /> Dashboard
        </Link>
        <h1 className="font-display text-lg font-semibold">HIIT / Tabata</h1>
        <button onClick={() => { setEditing(e => !e); setDraft(config) }}
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: ELEV, color: editing ? A : MUT }}>
          <Settings size={15} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-5 pt-6 pb-10 max-w-md mx-auto w-full">

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2 w-full mb-6">
          {PRESETS.map(p => (
            <button key={p.name}
              onClick={() => setConfig({ work: p.work, rest: p.rest, rounds: p.rounds })}
              className="flex flex-col items-center py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                backgroundColor: config.work === p.work && config.rest === p.rest ? 'rgba(201,168,76,0.12)' : ELEV,
                border: `1.5px solid ${config.work === p.work && config.rest === p.rest ? A : BORD}`,
                color: config.work === p.work && config.rest === p.rest ? A : MUT,
              }}>
              <span>{p.name}</span>
              <span className="font-normal opacity-70 mt-0.5">{p.work}/{p.rest}</span>
            </button>
          ))}
        </div>

        {/* Config editor */}
        {editing && (
          <div className="w-full rounded-2xl p-4 mb-6" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
            <h3 className="text-sm font-semibold mb-4">Configurar</h3>
            {[
              { label: 'Trabajo (s)', key: 'work' },
              { label: 'Descanso (s)', key: 'rest' },
              { label: 'Rondas', key: 'rounds' },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between mb-3">
                <span className="text-sm" style={{ color: MUT }}>{label}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setDraft(d => ({ ...d, [key]: Math.max(1, (d as any)[key] - (key === 'rounds' ? 1 : 5)) }))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: ELEV, color: MUT }}>−</button>
                  <span className="w-10 text-center font-bold text-lg">{(draft as any)[key]}</span>
                  <button onClick={() => setDraft(d => ({ ...d, [key]: (d as any)[key] + (key === 'rounds' ? 1 : 5) }))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: ELEV, color: A }}>+</button>
                </div>
              </div>
            ))}
            <button onClick={() => { setConfig(draft); setEditing(false) }}
              className="w-full py-3 rounded-xl font-bold text-black text-sm mt-1"
              style={{ backgroundColor: A }}>
              Aplicar
            </button>
          </div>
        )}

        {/* Config summary */}
        <div className="flex gap-4 mb-8">
          {[
            { label: 'Trabajo', value: `${config.work}s`, color: '#e74c3c' },
            { label: 'Descanso', value: `${config.rest}s`, color: '#27ae60' },
            { label: 'Rondas', value: `${round}/${config.rounds}`, color: A },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 text-center px-3 py-3 rounded-xl"
              style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
              <div className="text-lg font-bold" style={{ color }}>{value}</div>
              <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: MUT }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Big ring timer */}
        <div className="relative mb-8" style={{ width: 220, height: 220 }}>
          <svg width={220} height={220} className="-rotate-90" viewBox="0 0 220 220">
            <circle cx={110} cy={110} r={R} fill="none" stroke="rgb(42,42,42)" strokeWidth={12} />
            <circle cx={110} cy={110} r={R} fill="none" stroke={ringColor} strokeWidth={12}
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s linear, stroke 0.3s' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: phase === 'work' ? '#e74c3c' : phase === 'rest' ? '#27ae60' : MUT }}>
              {phase === 'idle' ? 'Listo' : phase === 'work' ? '¡Trabaja!' : phase === 'rest' ? 'Descansa' : '¡Hecho!'}
            </span>
            <span className="font-display font-bold" style={{ fontSize: 72, lineHeight: 1, color: FG }}>
              {phase === 'idle' ? config.work : left}
            </span>
            {phase !== 'idle' && phase !== 'done' && (
              <span className="text-xs mt-1" style={{ color: MUT }}>segundos</span>
            )}
          </div>
        </div>

        {/* Overall progress */}
        {phase !== 'idle' && (
          <div className="w-full mb-6">
            <div className="flex justify-between text-xs mb-1" style={{ color: MUT }}>
              <span>Progreso total</span><span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: BORD }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: A }} />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-4 w-full">
          <button onClick={reset}
            className="w-14 h-14 flex items-center justify-center rounded-2xl"
            style={{ backgroundColor: ELEV, color: MUT }}>
            <RotateCcw size={20} />
          </button>
          <button
            onClick={() => phase === 'done' ? reset() : running ? setRunning(false) : start()}
            className="flex-1 h-14 flex items-center justify-center gap-3 rounded-2xl text-black font-bold text-lg"
            style={{ backgroundColor: A }}>
            {phase === 'done' ? <><RotateCcw size={18} /> Repetir</> :
             running ? <><Pause size={20} /> Pausar</> : <><Play size={20} /> {phase === 'idle' ? 'Comenzar' : 'Continuar'}</>}
          </button>
        </div>

        {/* Round indicators */}
        {phase !== 'idle' && (
          <div className="flex gap-1.5 mt-6 flex-wrap justify-center">
            {Array.from({ length: config.rounds }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full transition-all"
                style={{
                  backgroundColor: i < round - 1 ? A
                    : i === round - 1 ? (phase === 'work' ? '#e74c3c' : '#27ae60')
                    : ELEV
                }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
