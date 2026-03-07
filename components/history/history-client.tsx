'use client'
import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         isSameDay, getDay, getDaysInMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { getMuscleEmoji, calculateE1RM, formatDuration } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Search, X, TrendingUp } from 'lucide-react'

const A    = 'rgb(var(--accent))'
const SURF = 'rgb(var(--bg-surface))'
const ELEV = 'rgb(var(--bg-elevated))'
const BORD = 'rgb(var(--border))'
const MUT  = 'rgb(var(--muted))'
const FG   = 'rgb(var(--foreground))'

// ── Calendar ─────────────────────────────────────────────────────────────────
function Calendar({
  month, sessions, selected, onSelect
}: { month: Date; sessions: any[]; selected: any | null; onSelect: (s: any | null) => void }) {
  const start = startOfMonth(month)
  const end   = endOfMonth(month)
  const days  = eachDayOfInterval({ start, end })
  const offset = getDay(start) // 0=Sun

  const sessionsByDay = useMemo(() => {
    const m: Record<string, any[]> = {}
    for (const s of sessions) {
      if (!s.finished_at) continue
      const key = format(new Date(s.finished_at), 'yyyy-MM-dd')
      if (!m[key]) m[key] = []
      m[key].push(s)
    }
    return m
  }, [sessions])

  const DOW = ['Do','Lu','Ma','Mi','Ju','Vi','Sá']

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
      <div className="px-5 py-4">
        {/* DOW header */}
        <div className="grid grid-cols-7 mb-2">
          {DOW.map(d => (
            <div key={d} className="text-center text-[10px] uppercase tracking-widest py-1"
              style={{ color: MUT }}>{d}</div>
          ))}
        </div>
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            const daySessions = sessionsByDay[key] ?? []
            const hasSessions = daySessions.length > 0
            const isSelected = selected && daySessions.some(s => s.id === selected?.id)
            const isToday = isSameDay(day, new Date())

            return (
              <button key={key}
                onClick={() => hasSessions ? onSelect(isSelected ? null : daySessions[0]) : null}
                disabled={!hasSessions}
                className="flex flex-col items-center py-1.5 rounded-xl transition-all disabled:cursor-default"
                style={{
                  backgroundColor: isSelected ? 'rgba(201,168,76,0.15)' : 'transparent',
                  border: isToday ? `1.5px solid ${A}` : '1.5px solid transparent',
                }}>
                <span className="text-xs font-medium" style={{ color: isSelected ? A : isToday ? A : FG }}>
                  {format(day, 'd')}
                </span>
                {hasSessions && (
                  <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: isSelected ? A : 'rgba(201,168,76,0.6)' }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Session detail ────────────────────────────────────────────────────────────
function SessionDetail({ session, prevSession }: { session: any; prevSession: any | null }) {
  const sets = session.workout_sets ?? []
  const vol = sets.reduce((a: number, s: any) => a + (s.weight_kg??0)*(s.reps??0), 0)
  const prevVol = prevSession?.workout_sets?.reduce((a: number, s: any) => a + (s.weight_kg??0)*(s.reps??0), 0) ?? 0
  const dur = session.started_at && session.finished_at
    ? Math.round((new Date(session.finished_at).getTime() - new Date(session.started_at).getTime()) / 1000)
    : null

  // Group by exercise
  const byEx: Record<string, { name: string; muscle: string; sets: any[] }> = {}
  for (const s of sets) {
    const id = s.exercise?.id ?? s.exercise_id
    if (!byEx[id]) byEx[id] = { name: s.exercise?.name ?? '—', muscle: s.exercise?.muscle_group ?? '', sets: [] }
    byEx[id].sets.push(s)
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORD}` }}>
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: A }}>
          {session.finished_at ? format(new Date(session.finished_at), "EEEE d 'de' MMMM", { locale: es }) : '—'}
        </p>
        <h3 className="font-display text-lg font-semibold">{session.routine?.name ?? 'Sesión libre'}</h3>
        <div className="flex gap-4 mt-2">
          <span className="text-xs" style={{ color: MUT }}>
            📦 <b>{vol.toLocaleString()} kg</b> volumen
            {prevVol > 0 && (
              <span style={{ color: vol > prevVol ? '#34C759' : '#FF3B30' }}>
                {' '}{vol > prevVol ? '↑' : '↓'}{Math.abs(Math.round(((vol-prevVol)/prevVol)*100))}%
              </span>
            )}
          </span>
          {dur && <span className="text-xs" style={{ color: MUT }}>⏱ <b>{formatDuration(dur)}</b></span>}
          <span className="text-xs" style={{ color: MUT }}>📊 <b>{sets.length}</b> series</span>
        </div>
      </div>
      <div className="px-5 py-3 space-y-3">
        {Object.values(byEx).map(ex => {
          const best = ex.sets.reduce((b: any, s: any) => {
            const e = calculateE1RM(s.weight_kg??0, s.reps??0)
            return e > (b ? calculateE1RM(b.weight_kg??0, b.reps??0) : 0) ? s : b
          }, null)
          return (
            <div key={ex.name}>
              <div className="flex items-center gap-2 mb-1.5">
                <span>{getMuscleEmoji(ex.muscle)}</span>
                <span className="text-sm font-semibold">{ex.name}</span>
                {best && (
                  <span className="ml-auto text-xs font-bold" style={{ color: A }}>
                    1RM ~{calculateE1RM(best.weight_kg??0, best.reps??0)}kg
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ex.sets.map((s: any, i: number) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                    style={{ backgroundColor: ELEV, color: MUT }}>
                    {s.weight_kg}kg × {s.reps}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Exercise search / progression ─────────────────────────────────────────────
function ExerciseSearch({ sessions, exercises }: { sessions: any[]; exercises: any[] }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<any | null>(null)

  const filtered = exercises.filter(e =>
    e.name.toLowerCase().includes(query.toLowerCase()) && query.length > 0
  ).slice(0, 6)

  const progression = useMemo(() => {
    if (!selected) return []
    const pts: { date: string; e1rm: number; kg: number; reps: number }[] = []
    for (const s of [...sessions].reverse()) {
      const match = s.workout_sets?.filter((ws: any) => ws.exercise?.id === selected.id || ws.exercise_id === selected.id)
      if (!match?.length) continue
      const best = match.reduce((b: any, ws: any) => {
        const e = calculateE1RM(ws.weight_kg??0, ws.reps??0)
        return e > (b ? calculateE1RM(b.weight_kg??0, b.reps??0) : 0) ? ws : b
      }, null)
      if (best) pts.push({
        date: format(new Date(s.finished_at), 'd MMM', { locale: es }),
        e1rm: calculateE1RM(best.weight_kg??0, best.reps??0),
        kg: best.weight_kg??0,
        reps: best.reps??0,
      })
    }
    return pts.slice(-10)
  }, [selected, sessions])

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <TrendingUp size={14} style={{ color: A }} /> Progresión por ejercicio
      </h3>

      {/* Search box */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUT }} />
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar ejercicio…"
          className="w-full pl-9 pr-9 py-3 rounded-xl text-sm focus:outline-none"
          style={{ backgroundColor: SURF, border: `1px solid ${BORD}`, color: FG }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setSelected(null) }}
            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: MUT }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {filtered.length > 0 && !selected && (
        <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${BORD}` }}>
          {filtered.map(e => (
            <button key={e.id} onClick={() => { setSelected(e); setQuery(e.name) }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left"
              style={{ backgroundColor: SURF, borderBottom: `1px solid ${BORD}` }}>
              <span>{getMuscleEmoji(e.muscle_group)}</span>
              <span>{e.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Progression chart */}
      {selected && progression.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">{selected.name}</span>
            <span className="text-xs" style={{ color: MUT }}>{progression.length} sesiones</span>
          </div>

          {/* Bar-like mini chart */}
          {(() => {
            const max1rm = Math.max(...progression.map(p => p.e1rm))
            return (
              <div className="flex items-end gap-1 h-20 mb-3">
                {progression.map((p, i) => {
                  const h = max1rm > 0 ? Math.max(8, Math.round((p.e1rm / max1rm) * 80)) : 8
                  const isLast = i === progression.length - 1
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px]" style={{ color: isLast ? A : 'transparent' }}>
                        {p.e1rm}
                      </span>
                      <div className="w-full rounded-t-md transition-all"
                        style={{ height: h, backgroundColor: isLast ? A : 'rgba(201,168,76,0.3)' }} />
                    </div>
                  )
                })}
              </div>
            )
          })()}

          <div className="flex justify-between text-[10px]" style={{ color: MUT }}>
            <span>{progression[0]?.date}</span>
            <span>1RM estimado (kg)</span>
            <span>{progression[progression.length-1]?.date}</span>
          </div>

          <div className="mt-3 pt-3 flex justify-between" style={{ borderTop: `1px solid ${BORD}` }}>
            <div>
              <p className="text-xs" style={{ color: MUT }}>Mejor 1RM</p>
              <p className="text-lg font-bold">{Math.max(...progression.map(p=>p.e1rm))}kg</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: MUT }}>Progresión</p>
              <p className="text-lg font-bold" style={{
                color: progression[progression.length-1]?.e1rm > progression[0]?.e1rm ? '#34C759' : '#FF3B30'
              }}>
                {progression.length >= 2
                  ? `${progression[progression.length-1].e1rm > progression[0].e1rm ? '+' : ''}${Math.round(((progression[progression.length-1].e1rm - progression[0].e1rm) / progression[0].e1rm)*100)}%`
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
      {selected && progression.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: MUT }}>Sin datos para {selected.name}</p>
      )}
    </div>
  )
}

// ── Main HistoryClient ────────────────────────────────────────────────────────
export function HistoryClient({ sessions, exercises }: { sessions: any[]; exercises: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedSession, setSelectedSession] = useState<any | null>(null)

  const monthSessions = useMemo(() =>
    sessions.filter(s => {
      if (!s.finished_at) return false
      const d = new Date(s.finished_at)
      return d.getFullYear() === currentMonth.getFullYear()
        && d.getMonth() === currentMonth.getMonth()
    }), [sessions, currentMonth])

  const prevMonth = () => setCurrentMonth(m => {
    const n = new Date(m); n.setMonth(n.getMonth() - 1); return n
  })
  const nextMonth = () => setCurrentMonth(m => {
    const n = new Date(m); n.setMonth(n.getMonth() + 1); return n
  })

  // Find same-name session the week before for comparison
  const prevSessionForSelected = useMemo(() => {
    if (!selectedSession) return null
    const t = new Date(selectedSession.finished_at).getTime()
    return sessions.find(s =>
      s.id !== selectedSession.id &&
      s.routine?.name === selectedSession.routine?.name &&
      new Date(s.finished_at).getTime() < t
    ) ?? null
  }, [selectedSession, sessions])

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-semibold mb-6">Historial</h1>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: SURF, border: `1px solid ${BORD}`, color: MUT }}>
          <ChevronLeft size={16} />
        </button>
        <h2 className="font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
          <span className="ml-2 text-sm font-normal" style={{ color: MUT }}>
            ({monthSessions.length} sesiones)
          </span>
        </h2>
        <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: SURF, border: `1px solid ${BORD}`, color: MUT }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar */}
      <div className="mb-5">
        <Calendar
          month={currentMonth}
          sessions={monthSessions}
          selected={selectedSession}
          onSelect={setSelectedSession} />
      </div>

      {/* Selected session detail */}
      {selectedSession && (
        <div className="mb-6">
          <SessionDetail session={selectedSession} prevSession={prevSessionForSelected} />
        </div>
      )}

      {/* Recent list if nothing selected */}
      {!selectedSession && sessions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3">Sesiones recientes</h3>
          <div className="space-y-2">
            {sessions.slice(0, 10).map(s => {
              const vol = s.workout_sets?.reduce((a: number, x: any) => a + (x.weight_kg??0)*(x.reps??0), 0) ?? 0
              return (
                <button key={s.id} onClick={() => setSelectedSession(s)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left"
                  style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
                  <div>
                    <div className="text-sm font-medium">{s.routine?.name ?? 'Sesión libre'}</div>
                    <div className="text-xs mt-0.5" style={{ color: MUT }}>
                      {s.finished_at ? format(new Date(s.finished_at), "d MMM · HH:mm", { locale: es }) : '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: A }}>{vol > 0 ? `${vol.toLocaleString()}kg` : '—'}</div>
                    <div className="text-xs" style={{ color: MUT }}>{s.workout_sets?.length ?? 0} series</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Exercise progression search */}
      <ExerciseSearch sessions={sessions} exercises={exercises} />
    </div>
  )
}
