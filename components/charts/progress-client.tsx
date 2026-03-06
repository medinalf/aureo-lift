'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { getMuscleGroupLabel } from '@/lib/utils'

const RANGES = [{ label: '1M', months: 1 }, { label: '3M', months: 3 }, { label: '6M', months: 6 }, { label: '1A', months: 12 }]

export function ProgressClient({ userId, exercises }: any) {
  const supabase = createClient()
  const [selected, setSelected] = useState<string>(exercises[0]?.id ?? '')
  const [range, setRange] = useState(3)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selected) return
    const fetch = async () => {
      setLoading(true)
      const start = subMonths(new Date(), range).toISOString()
      const { data: rows } = await supabase.from('workout_sets')
        .select('weight_kg, reps, completed_at, workout_sessions!inner(user_id, status)')
        .eq('exercise_id', selected).eq('workout_sessions.user_id', userId)
        .eq('workout_sessions.status', 'completed').eq('is_warmup', false)
        .not('weight_kg', 'is', null).gte('completed_at', start)
        .order('completed_at', { ascending: true })
      const byDate = new Map<string, { max_weight: number; total_volume: number }>()
      for (const r of (rows ?? []) as any[]) {
        const d = format(new Date(r.completed_at), 'yyyy-MM-dd')
        const cur = byDate.get(d) ?? { max_weight: 0, total_volume: 0 }
        byDate.set(d, { max_weight: Math.max(cur.max_weight, r.weight_kg ?? 0), total_volume: cur.total_volume + (r.weight_kg ?? 0) * (r.reps ?? 0) })
      }
      setData(Array.from(byDate.entries()).map(([date, v]) => ({
        date: format(new Date(date), 'd MMM', { locale: es }), ...v
      })))
      setLoading(false)
    }
    fetch()
  }, [selected, range])

  const groups = Array.from(new Set(exercises.map((e: any) => e.muscle_group))) as string[]

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgb(var(--muted))' }}>Análisis</p>
        <h1 className="font-display text-3xl font-semibold">Progresión</h1>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {RANGES.map(r => (
          <button key={r.label} onClick={() => setRange(r.months)}
            className="px-4 py-2 text-xs font-semibold rounded-xl transition-colors"
            style={{ backgroundColor: range === r.months ? 'rgb(var(--accent))' : 'rgb(var(--bg-elevated))', color: range === r.months ? 'black' : 'rgb(var(--muted))' }}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--border))' }}>
        <label className="block text-xs uppercase tracking-widest mb-3" style={{ color: 'rgb(var(--muted))' }}>Ejercicio</label>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none"
          style={{ backgroundColor: 'rgb(var(--bg-input))', border: '1px solid rgb(var(--border))', color: 'rgb(var(--foreground))' }}>
          {groups.map(g => (
            <optgroup key={g} label={getMuscleGroupLabel(g)}>
              {exercises.filter((e: any) => e.muscle_group === g).map((e: any) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center" style={{ color: 'rgb(var(--muted))' }}>Cargando...</div>
      ) : data.length > 0 ? (
        <div className="space-y-6">
          {[{ key: 'max_weight', label: 'Peso Máximo (kg)', color: '#C9A84C' }, { key: 'total_volume', label: 'Volumen Total (kg)', color: '#4CAF7D' }].map(chart => (
            <div key={chart.key} className="rounded-2xl p-5" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--border))' }}>
              <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'rgb(var(--muted))' }}>{chart.label}</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id={`g-${chart.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chart.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chart.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: 'rgb(92,92,92)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgb(92,92,92)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgb(26,26,26)', border: '1px solid rgb(42,42,42)', borderRadius: 12, fontSize: 12 }} itemStyle={{ color: chart.color }} labelStyle={{ color: 'rgb(92,92,92)' }} />
                  <Area type="monotone" dataKey={chart.key} stroke={chart.color} fill={`url(#g-${chart.key})`} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20" style={{ color: 'rgb(var(--muted))' }}>
          <div className="text-5xl mb-4">📈</div>
          <p>Sin datos para este ejercicio en este periodo</p>
        </div>
      )}
    </div>
  )
}
