'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWorkoutStore } from '@/stores/workout-store'
import { getMuscleEmoji, getMuscleGroupLabel, formatDuration } from '@/lib/utils'
import { Play, Plus, Check, ChevronDown, ChevronUp, Timer, X } from 'lucide-react'

export function WorkoutClient({ userId, routine }: any) {
  const router = useRouter()
  const supabase = createClient()
  const store = useWorkoutStore()
  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [restLeft, setRestLeft] = useState(0)
  const [expandedEx, setExpandedEx] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [prevSets, setPrevSets] = useState<Record<string, any[]>>({})
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const exercises = routine
    ? routine.routine_days?.flatMap((d: any) => d.routine_exercises ?? []) ?? []
    : []

  useEffect(() => {
    if (!started) return
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [started])

  useEffect(() => {
    if (!store.isResting) return
    setRestLeft(store.restTimer)
    const t = setInterval(() => setRestLeft(r => { if (r <= 1) { clearInterval(t); store.stopRest(); return 0 } return r - 1 }), 1000)
    return () => clearInterval(t)
  }, [store.isResting])

  const startWorkout = async () => {
    setLoading(true)
    const { data } = await supabase.from('workout_sessions').insert({
      user_id: userId, routine_id: routine?.id ?? null, status: 'in_progress', started_at: new Date().toISOString()
    }).select().single()
    if (data) {
      store.startSession((data as any).id)
      if (routine) {
        for (const d of routine.routine_days ?? []) {
          for (const re of d.routine_exercises ?? []) {
            for (let i = 0; i < (re.target_sets ?? 3); i++) store.addSet(re.exercise_id)
          }
        }
        const ids = exercises.map((re: any) => re.exercise_id)
        const { data: ps } = await supabase.from('workout_sets')
          .select('*, session:workout_sessions!inner(user_id, finished_at, status)')
          .in('exercise_id', ids).eq('session.user_id', userId).eq('session.status', 'completed')
          .order('session.finished_at', { ascending: false }).limit(100)
        const map: Record<string, any[]> = {}
        for (const s of (ps ?? []) as any[]) {
          if (!map[s.exercise_id]) map[s.exercise_id] = []
          if (map[s.exercise_id].length < 5) map[s.exercise_id].push(s)
        }
        setPrevSets(map)
      }
    }
    setStarted(true); setExpandedEx(exercises[0]?.exercise_id ?? null)
    setLoading(false)
  }

  const finishWorkout = async () => {
    setLoading(true)
    const completedSets = store.sets.filter(s => s.completed)
    for (const s of completedSets) {
      await supabase.from('workout_sets').insert({
        session_id: store.sessionId, exercise_id: s.exercise_id,
        set_number: s.set_number, weight_kg: s.weight_kg, reps: s.reps,
        completed_at: new Date().toISOString()
      })
    }
    await supabase.from('workout_sessions').update({ status: 'completed', finished_at: new Date().toISOString() }).eq('id', store.sessionId)
    store.reset(); router.push('/dashboard'); router.refresh()
  }

  if (!started) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="text-6xl mb-6">🏋️</div>
        <h1 className="font-display text-4xl font-semibold mb-3">{routine?.name ?? 'Entrenamiento Libre'}</h1>
        <p className="text-sm mb-2" style={{ color: 'rgb(var(--muted))' }}>
          {exercises.length} ejercicios
        </p>
        <button onClick={startWorkout} disabled={loading}
          className="mt-8 w-full py-5 text-black font-bold text-lg rounded-2xl flex items-center justify-center gap-3 disabled:opacity-60"
          style={{ backgroundColor: 'rgb(var(--accent))' }}>
          <Play size={22} /> Comenzar
        </button>
        <button onClick={() => router.back()} className="mt-4 text-sm" style={{ color: 'rgb(var(--muted))' }}>Cancelar</button>
      </div>
    </div>
  )

  const exerciseList = routine
    ? routine.routine_days?.flatMap((d: any) => d.routine_exercises?.sort((a: any, b: any) => a.order_index - b.order_index) ?? []) ?? []
    : []

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-32">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">{routine?.name ?? 'Libre'}</h1>
          <p className="text-sm" style={{ color: 'rgb(var(--accent))' }}>{formatDuration(elapsed)}</p>
        </div>
        <button onClick={finishWorkout} disabled={loading}
          className="px-5 py-2.5 text-black font-semibold text-sm rounded-xl disabled:opacity-60"
          style={{ backgroundColor: 'rgb(var(--accent))' }}>
          Finalizar
        </button>
      </div>

      {store.isResting && (
        <div className="rounded-2xl p-5 mb-6 text-center" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: `1px solid rgba(201,168,76,0.3)` }}>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--muted))' }}>Descanso</p>
          <div className="font-display text-5xl font-bold mb-3" style={{ color: 'rgb(var(--accent))' }}>{restLeft}s</div>
          <button onClick={store.stopRest} className="text-sm px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--bg-elevated))' }}>
            <X size={14} className="inline mr-1" />Saltar
          </button>
        </div>
      )}

      <div className="space-y-3">
        {exerciseList.map((re: any) => {
          const exSets = store.sets.filter(s => s.exercise_id === re.exercise_id)
          const prev = prevSets[re.exercise_id] ?? []
          const isExpanded = expandedEx === re.exercise_id
          const done = exSets.filter(s => s.completed).length
          return (
            <div key={re.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--border))' }}>
              <button onClick={() => setExpandedEx(isExpanded ? null : re.exercise_id)}
                className="w-full flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: 'rgba(201,168,76,0.1)' }}>
                  {getMuscleEmoji(re.exercise?.muscle_group)}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{re.exercise?.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
                    {done}/{exSets.length} series · {getMuscleGroupLabel(re.exercise?.muscle_group)}
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} style={{ color: 'rgb(var(--muted))' }} /> : <ChevronDown size={16} style={{ color: 'rgb(var(--muted))' }} />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid rgb(var(--border))' }}>
                  {prev.length > 0 && (
                    <p className="text-xs py-2" style={{ color: 'rgb(var(--muted))' }}>
                      Anterior: {prev[0].weight_kg}kg × {prev[0].reps}
                    </p>
                  )}
                  {exSets.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <span className="text-xs w-6 text-center font-semibold" style={{ color: s.completed ? 'rgb(var(--accent))' : 'rgb(var(--muted))' }}>{i + 1}</span>
                      <input type="number" value={s.weight_kg || ''} onChange={e => store.updateSet(re.exercise_id, i, { weight_kg: parseFloat(e.target.value) || 0 })}
                        placeholder="kg" className="w-20 px-3 py-2 text-sm text-center rounded-xl focus:outline-none"
                        style={{ backgroundColor: 'rgb(var(--bg-input))', border: '1px solid rgb(var(--border))' }} />
                      <span className="text-xs" style={{ color: 'rgb(var(--muted))' }}>×</span>
                      <input type="number" value={s.reps || ''} onChange={e => store.updateSet(re.exercise_id, i, { reps: parseInt(e.target.value) || 0 })}
                        placeholder="reps" className="w-20 px-3 py-2 text-sm text-center rounded-xl focus:outline-none"
                        style={{ backgroundColor: 'rgb(var(--bg-input))', border: '1px solid rgb(var(--border))' }} />
                      <button onClick={() => store.completeSet(re.exercise_id, i)} disabled={s.completed}
                        className="ml-auto w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40"
                        style={{ backgroundColor: s.completed ? 'rgba(76,175,125,0.2)' : 'rgb(var(--bg-elevated))', color: s.completed ? 'rgb(var(--success))' : 'rgb(var(--muted))' }}>
                        <Check size={16} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => store.addSet(re.exercise_id)}
                    className="flex items-center gap-2 text-xs py-2 w-full justify-center rounded-xl mt-1"
                    style={{ color: 'rgb(var(--muted))', border: '1px dashed rgb(var(--border))' }}>
                    <Plus size={12} /> Agregar serie
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
