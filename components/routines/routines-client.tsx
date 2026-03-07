'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WeeklyCalendar } from './weekly-calendar'
import { QuickWorkout } from '@/components/workout/quick-workout'
import { regenerateRoutine, RegenerateParams } from '@/lib/regenerate-routine'
import { getMuscleEmoji } from '@/lib/utils'
import {
  RefreshCw, ChevronRight, Target, Clock, Dumbbell,
  Check, X, Loader2, Sliders, History, Plus
} from 'lucide-react'

const A    = 'rgb(var(--accent))'
const SURF = 'rgb(var(--bg-surface))'
const ELEV = 'rgb(var(--bg-elevated))'
const BORD = 'rgb(var(--border))'
const MUT  = 'rgb(var(--muted))'
const FG   = 'rgb(var(--foreground))'

// ── Goal / Level / Equipment maps ─────────────────────────────────────────────
const GOALS = [
  { value: 'fat_loss',     label: 'Perder grasa',    emoji: '🔥' },
  { value: 'hypertrophy',  label: 'Ganar músculo',   emoji: '💪' },
  { value: 'strength',     label: 'Fuerza',          emoji: '🏋️' },
  { value: 'maintenance',  label: 'Mantenimiento',   emoji: '⚖️' },
]
const LEVELS = [
  { value: 'beginner',     label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced',     label: 'Avanzado' },
]
const EQUIPMENT_OPTIONS = [
  { value: 'barbell',      label: 'Barra' },
  { value: 'dumbbells',    label: 'Mancuernas' },
  { value: 'machines',     label: 'Máquinas' },
  { value: 'cables',       label: 'Cables' },
  { value: 'bodyweight',   label: 'Peso corporal' },
  { value: 'kettlebells',  label: 'Kettlebells' },
]

// ── Re-generate panel ─────────────────────────────────────────────────────────
function RegeneratePanel({
  profile, onGenerate, onClose
}: { profile: any; onGenerate: (p: RegenerateParams) => Promise<void>; onClose: () => void }) {
  const [goal,      setGoal]      = useState<string>(profile?.fitness_goal ?? 'hypertrophy')
  const [freq,      setFreq]      = useState<number>(profile?.weekly_frequency ?? 3)
  const [level,     setLevel]     = useState<string>(profile?.experience_level ?? 'intermediate')
  const [equipment, setEquipment] = useState<string[]>(profile?.equipment ?? ['barbell','dumbbells'])
  const [loading,   setLoading]   = useState(false)

  const toggleEq = (v: string) =>
    setEquipment(e => e.includes(v) ? e.filter(x => x !== v) : [...e, v])

  const handle = async () => {
    setLoading(true)
    await onGenerate({ goal: goal as any, weeklyFrequency: freq, experienceLevel: level as any, equipment: equipment as any[] })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgb(var(--bg-primary))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ backgroundColor: SURF, borderBottom: `1px solid ${BORD}` }}>
        <h2 className="font-display text-xl font-semibold">Ajustar objetivos</h2>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: ELEV, color: MUT }}>
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 max-w-lg mx-auto w-full">

        {/* Goal */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: MUT }}>Objetivo</p>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map(g => (
              <button key={g.value} onClick={() => setGoal(g.value)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-left transition-all"
                style={{
                  backgroundColor: goal === g.value ? 'rgba(201,168,76,0.12)' : ELEV,
                  border: `1.5px solid ${goal === g.value ? A : BORD}`,
                  color: goal === g.value ? A : FG,
                }}>
                <span className="text-xl">{g.emoji}</span>{g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: MUT }}>
            Días por semana: <span style={{ color: A }}>{freq}</span>
          </p>
          <div className="flex gap-2">
            {[2,3,4,5,6].map(n => (
              <button key={n} onClick={() => setFreq(n)}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                style={{
                  backgroundColor: freq === n ? 'rgba(201,168,76,0.12)' : ELEV,
                  border: `1.5px solid ${freq === n ? A : BORD}`,
                  color: freq === n ? A : MUT,
                }}>{n}</button>
            ))}
          </div>
        </div>

        {/* Level */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: MUT }}>Nivel</p>
          <div className="flex gap-2">
            {LEVELS.map(l => (
              <button key={l.value} onClick={() => setLevel(l.value)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: level === l.value ? 'rgba(201,168,76,0.12)' : ELEV,
                  border: `1.5px solid ${level === l.value ? A : BORD}`,
                  color: level === l.value ? A : MUT,
                }}>{l.label}</button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: MUT }}>Equipamiento</p>
          <div className="grid grid-cols-2 gap-2">
            {EQUIPMENT_OPTIONS.map(e => (
              <button key={e.value} onClick={() => toggleEq(e.value)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: equipment.includes(e.value) ? 'rgba(201,168,76,0.12)' : ELEV,
                  border: `1.5px solid ${equipment.includes(e.value) ? A : BORD}`,
                  color: equipment.includes(e.value) ? A : MUT,
                }}>
                {equipment.includes(e.value) && <Check size={13} style={{ color: A }} />}
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button onClick={handle} disabled={loading || equipment.length === 0}
          className="w-full py-5 text-black font-bold text-lg rounded-2xl flex items-center justify-center gap-3 disabled:opacity-60"
          style={{ backgroundColor: A }}>
          {loading ? <Loader2 size={22} className="animate-spin" /> : <RefreshCw size={20} />}
          Generar nueva rutina
        </button>
        <p className="text-xs text-center pb-4" style={{ color: MUT }}>
          La rutina actual se guardará en el historial.
        </p>
      </div>
    </div>
  )
}

// ── Main RoutinesClient ───────────────────────────────────────────────────────
export function RoutinesClient({ userId, profile, routine, routineHistory }: any) {
  const router = useRouter()
  const supabase = createClient()

  const [showRegenerate, setShowRegenerate] = useState(false)
  const [activeWorkoutDay, setActiveWorkoutDay] = useState<any | null>(null)
  const [lastPerf, setLastPerf] = useState<Record<string, any[]>>({})
  const [showHistory, setShowHistory] = useState(false)

  const today = new Date().getDay()

  const routineDays = routine?.routine_days ?? []
  const todayDay    = routineDays.find((d: any) => d.day_of_week === today) ?? null
  const todayExercises = todayDay
    ? [...(todayDay.routine_exercises ?? [])].sort((a: any, b: any) => a.order_index - b.order_index)
    : []

  // Load last perf when starting a workout
  const startWorkoutDay = async (day: any) => {
    const exIds = (day.routine_exercises ?? []).map((re: any) => re.exercise_id)
    if (exIds.length > 0) {
      const { data } = await supabase
        .from('workout_sets')
        .select('*, session:workout_sessions!inner(user_id, status, finished_at)')
        .in('exercise_id', exIds)
        .eq('session.user_id', userId)
        .eq('session.status', 'completed')
        .order('session.finished_at', { ascending: false })
        .limit(200)

      const perf: Record<string, any[]> = {}
      for (const s of (data ?? []) as any[]) {
        if (!perf[s.exercise_id]) perf[s.exercise_id] = []
        if (perf[s.exercise_id].length < 6) perf[s.exercise_id].push(s)
      }
      setLastPerf(perf)
    }
    setActiveWorkoutDay(day)
  }

  const handleRegenerate = async (params: RegenerateParams) => {
    const { error } = await regenerateRoutine(supabase, userId, params)
    if (!error) {
      setShowRegenerate(false)
      router.refresh()
    }
  }

  return (
    <>
      {/* QuickWorkout modal for selected day */}
      {activeWorkoutDay && (
        <QuickWorkout
          userId={userId}
          routine={routine}
          todayDay={activeWorkoutDay}
          todayExercises={[...(activeWorkoutDay.routine_exercises ?? [])].sort((a: any, b: any) => a.order_index - b.order_index)}
          lastPerf={lastPerf}
          onClose={() => setActiveWorkoutDay(null)}
        />
      )}

      {/* Regenerate panel */}
      {showRegenerate && (
        <RegeneratePanel
          profile={profile}
          onGenerate={handleRegenerate}
          onClose={() => setShowRegenerate(false)}
        />
      )}

      <div className="p-5 md:p-8 max-w-2xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-semibold">Mis Rutinas</h1>
          <button onClick={() => setShowRegenerate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: SURF, border: `1px solid ${BORD}`, color: A }}>
            <Sliders size={14} /> Ajustar objetivos
          </button>
        </div>

        {routine ? (
          <>
            {/* ── Active routine info ── */}
            <div className="rounded-2xl p-5 mb-5"
              style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs uppercase tracking-widest" style={{ color: A }}>Rutina activa</span>
                  <h2 className="font-display text-xl font-semibold mt-0.5">{routine.name}</h2>
                  {routine.description && (
                    <p className="text-sm mt-1" style={{ color: MUT }}>{routine.description}</p>
                  )}
                </div>
                <span className="text-xs px-2 py-1 rounded-full flex-shrink-0 ml-3"
                  style={{ backgroundColor: 'rgba(201,168,76,0.12)', color: A }}>
                  v{routine.version ?? 1}
                </span>
              </div>

              {/* Profile config summary */}
              {profile && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    { icon: <Target size={11} />, text: GOALS.find(g => g.value === profile.fitness_goal)?.label ?? profile.fitness_goal },
                    { icon: <Clock size={11} />,  text: `${profile.weekly_frequency}d/semana` },
                    { icon: <Dumbbell size={11} />, text: LEVELS.find(l => l.value === profile.experience_level)?.label ?? profile.experience_level },
                  ].map(({ icon, text }) => text && (
                    <span key={text} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: ELEV, color: MUT }}>
                      {icon}{text}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Weekly calendar ── */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Planificación semanal</h3>
              <WeeklyCalendar
                routineDays={routineDays}
                routineName={routine.name}
                onStartDay={startWorkoutDay}
              />
            </div>

            {/* ── Routine history ── */}
            {routineHistory.length > 0 && (
              <div>
                <button onClick={() => setShowHistory(h => !h)}
                  className="flex items-center justify-between w-full mb-3">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <History size={14} style={{ color: MUT }} />
                    Rutinas anteriores ({routineHistory.length})
                  </span>
                  <ChevronRight size={14} style={{ color: MUT, transform: showHistory ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {showHistory && (
                  <div className="space-y-2">
                    {routineHistory.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                        style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
                        <div>
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: MUT }}>
                            {r.superseded_at
                              ? `Reemplazada ${new Date(r.superseded_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`
                              : 'Historial'}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full"
                          style={{ backgroundColor: ELEV, color: MUT }}>
                          v{r.version ?? 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* ── Empty state ── */
          <div className="text-center py-16">
            <p className="text-4xl mb-4">📋</p>
            <p className="font-semibold text-xl mb-2">Sin rutina activa</p>
            <p className="text-sm mb-8" style={{ color: MUT }}>
              Generá tu primera rutina personalizada en base a tus objetivos.
            </p>
            <button onClick={() => setShowRegenerate(true)}
              className="px-8 py-4 text-black font-bold text-base rounded-2xl inline-flex items-center gap-3"
              style={{ backgroundColor: A }}>
              <Plus size={18} /> Crear rutina
            </button>
          </div>
        )}
      </div>
    </>
  )
}
