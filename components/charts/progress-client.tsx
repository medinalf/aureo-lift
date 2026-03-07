'use client'
import { useState, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts'
import { format, startOfWeek, getWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { getMuscleEmoji, getMuscleGroupLabel, calculateE1RM } from '@/lib/utils'
import { TrendingUp, BarChart2, Activity } from 'lucide-react'

const A    = 'rgb(var(--accent))'
const SURF = 'rgb(var(--bg-surface))'
const BORD = 'rgb(var(--border))'
const MUT  = 'rgb(var(--muted))'
const FG   = 'rgb(var(--foreground))'

// Custom tooltip
function ChartTip({ active, payload, label, unit = 'kg' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-xs shadow-lg"
      style={{ backgroundColor: 'rgb(var(--bg-elevated))', border: `1px solid rgb(var(--accent))`, color: FG }}>
      <p className="font-bold mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? A }}>
          {p.name}: <b>{p.value}{unit}</b>
        </p>
      ))}
    </div>
  )
}

export function ProgressClient({ oneRepHistory, sessionVols, weekSessions }: any) {
  // Group exercises for selector
  const exercises = useMemo(() => {
    const m = new Map<string, { id: string; name: string; muscle: string; count: number }>()
    for (const r of oneRepHistory) {
      const id = r.exercise?.id ?? r.exercise_id
      if (!m.has(id)) m.set(id, { id, name: r.exercise?.name ?? id, muscle: r.exercise?.muscle_group ?? '', count: 0 })
      m.get(id)!.count++
    }
    return [...m.values()].sort((a, b) => b.count - a.count)
  }, [oneRepHistory])

  const [selectedEx, setSelectedEx] = useState<string>(exercises[0]?.id ?? '')

  // 1RM data for selected exercise
  const e1rmData = useMemo(() => {
    if (!selectedEx) return []
    return oneRepHistory
      .filter((r: any) => (r.exercise?.id ?? r.exercise_id) === selectedEx)
      .map((r: any) => ({
        date: format(new Date(r.calculated_at), 'd MMM', { locale: es }),
        '1RM': r.one_rep_max,
        kg: r.weight_kg,
        reps: r.reps,
      }))
      .slice(-20)
  }, [selectedEx, oneRepHistory])

  // Volume per session
  const volData = useMemo(() =>
    sessionVols.map((s: any) => ({
      date: s.finished_at ? format(new Date(s.finished_at), 'd MMM', { locale: es }) : '—',
      Volumen: Math.round(s.workout_sets?.reduce((a: number, x: any) => a + (x.weight_kg??0)*(x.reps??0), 0) ?? 0),
      label: s.routine?.name ?? 'Libre',
    })), [sessionVols])

  // Sessions per week
  const freqData = useMemo(() => {
    const weeks: Record<string, number> = {}
    for (const s of weekSessions) {
      const w = format(startOfWeek(new Date(s.finished_at), { weekStartsOn: 1 }), "'S'w · MMM", { locale: es })
      weeks[w] = (weeks[w] ?? 0) + 1
    }
    return Object.entries(weeks).map(([week, sessions]) => ({ week, sessions }))
  }, [weekSessions])

  const selectedMeta = exercises.find(e => e.id === selectedEx)
  const best1RM = e1rmData.length ? Math.max(...e1rmData.map((d: any) => d['1RM'])) : 0
  const first1RM = e1rmData[0]?.['1RM'] ?? 0
  const last1RM = e1rmData[e1rmData.length - 1]?.['1RM'] ?? 0
  const progress1RM = first1RM > 0 ? Math.round(((last1RM - first1RM) / first1RM) * 100) : 0

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-semibold mb-6">Progresión</h1>

      {/* ── Exercise 1RM chart ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} style={{ color: A }} />
          <h2 className="text-sm font-semibold uppercase tracking-widest">1RM Estimado</h2>
        </div>

        {/* Exercise selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {exercises.slice(0, 8).map(ex => (
            <button key={ex.id}
              onClick={() => setSelectedEx(ex.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all"
              style={{
                backgroundColor: selectedEx === ex.id ? 'rgba(201,168,76,0.15)' : 'rgb(var(--bg-elevated))',
                border: `1.5px solid ${selectedEx === ex.id ? A : BORD}`,
                color: selectedEx === ex.id ? A : MUT,
              }}>
              {getMuscleEmoji(ex.muscle)} {ex.name}
            </button>
          ))}
        </div>

        {/* Stats row */}
        {e1rmData.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Mejor 1RM', value: `${best1RM}kg` },
              { label: 'Actual', value: `${last1RM}kg` },
              { label: 'Progresión', value: `${progress1RM >= 0 ? '+' : ''}${progress1RM}%`,
                color: progress1RM >= 0 ? '#34C759' : '#FF3B30' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
                <p className="text-xs mb-1" style={{ color: MUT }}>{label}</p>
                <p className="text-lg font-bold" style={{ color: color ?? FG }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Line chart */}
        {e1rmData.length >= 2 ? (
          <div className="rounded-2xl p-4" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={e1rmData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUT }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: MUT }} tickLine={false} axisLine={false}
                  domain={['auto', 'auto']} />
                <Tooltip content={<ChartTip unit="kg" />} />
                <Line type="monotone" dataKey="1RM" stroke={A} strokeWidth={2.5}
                  dot={{ fill: A, r: 3 }} activeDot={{ r: 5 }} name="1RM est." />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
            <p style={{ color: MUT }}>
              {e1rmData.length === 0
                ? 'Sin datos. Registrá entrenamientos para ver tu progresión.'
                : 'Necesitás al menos 2 sesiones para ver la gráfica.'}
            </p>
          </div>
        )}
      </section>

      {/* ── Volume chart ── */}
      {volData.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={15} style={{ color: A }} />
            <h2 className="text-sm font-semibold uppercase tracking-widest">Volumen por sesión</h2>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={volData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: MUT }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: MUT }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}t` : `${v}`} />
                <Tooltip content={<ChartTip unit="kg" />} />
                <Bar dataKey="Volumen" fill="rgba(201,168,76,0.7)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Frequency chart ── */}
      {freqData.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} style={{ color: A }} />
            <h2 className="text-sm font-semibold uppercase tracking-widest">Frecuencia semanal</h2>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={freqData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: MUT }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: MUT }} tickLine={false} axisLine={false}
                  allowDecimals={false} domain={[0, 7]} />
                <Tooltip content={<ChartTip unit=" sesiones" />} />
                <ReferenceLine y={3} stroke="rgba(201,168,76,0.25)" strokeDasharray="4 2" />
                <Bar dataKey="sessions" name="Sesiones" fill="rgba(201,168,76,0.6)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-center mt-2" style={{ color: MUT }}>
              Línea punteada = objetivo 3 sesiones/semana
            </p>
          </div>
        </section>
      )}

      {/* Empty state */}
      {exercises.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📈</p>
          <p className="font-semibold mb-2">Sin datos aún</p>
          <p className="text-sm" style={{ color: MUT }}>
            Registrá tus primeros entrenamientos y acá vas a ver tu progresión.
          </p>
        </div>
      )}
    </div>
  )
}
