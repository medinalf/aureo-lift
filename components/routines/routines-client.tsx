'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WeeklyCalendar } from './weekly-calendar'
import { QuickWorkout } from '@/components/workout/quick-workout'
import { regenerateRoutine, previewRoutine, saveGeneratedRoutine, RegenerateParams } from '@/lib/regenerate-routine'
import { GeneratedRoutine, GeneratedDay } from '@/lib/routine-generator'
import { getMuscleEmoji } from '@/lib/utils'
import {
  RefreshCw, ChevronRight, Target, Clock, Dumbbell, Check, X,
  Loader2, Sliders, History, Plus, Shuffle, Eye, Pencil,
  ChevronDown, ChevronUp, ArrowLeft, Save
} from 'lucide-react'

const A    = 'rgb(var(--accent))'
const SURF = 'rgb(var(--bg-surface))'
const ELEV = 'rgb(var(--bg-elevated))'
const BORD = 'rgb(var(--border))'
const MUT  = 'rgb(var(--muted))'
const FG   = 'rgb(var(--foreground))'

// ── Constants ─────────────────────────────────────────────────────────────────
const GOALS = [
  { value: 'fat_loss',    label: 'Perder grasa',  emoji: '🔥' },
  { value: 'hypertrophy', label: 'Ganar músculo', emoji: '💪' },
  { value: 'strength',    label: 'Fuerza',        emoji: '🏋️' },
  { value: 'maintenance', label: 'Mantenimiento', emoji: '⚖️' },
]
const LEVELS = [
  { value: 'beginner',     label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced',     label: 'Avanzado' },
]
// These must match mapProfileEquipmentToDb() keys
const EQUIPMENT_OPTIONS = [
  { value: 'barbell',    label: 'Barra',         emoji: '🏋️' },
  { value: 'dumbbells',  label: 'Mancuernas',    emoji: '🔵' },
  { value: 'machines',   label: 'Máquinas',      emoji: '🔧' },
  { value: 'cables',     label: 'Cables',        emoji: '〰️' },
  { value: 'bodyweight', label: 'Peso corporal', emoji: '🤸' },
  { value: 'kettlebells',label: 'Kettlebells',   emoji: '🫙' },
]

// ── Step 1: Configure objectives ──────────────────────────────────────────────
function ConfigStep({
  profile,
  onNext,
  onClose,
}: {
  profile: any
  onNext: (params: RegenerateParams) => void
  onClose: () => void
}) {
  const [goal,      setGoal]      = useState<string>(profile?.fitness_goal      ?? 'hypertrophy')
  const [freq,      setFreq]      = useState<number>(profile?.weekly_frequency  ?? 3)
  const [level,     setLevel]     = useState<string>(profile?.experience_level  ?? 'intermediate')
  const [equipment, setEquipment] = useState<string[]>(
    Array.isArray(profile?.equipment) && profile.equipment.length > 0
      ? profile.equipment
      : ['barbell', 'dumbbells']
  )
  const [loading, setLoading] = useState(false)

  const toggleEq = (v: string) =>
    setEquipment(e => e.includes(v) ? (e.length > 1 ? e.filter(x => x !== v) : e) : [...e, v])

  const handle = async () => {
    setLoading(true)
    onNext({ goal: goal as any, weeklyFrequency: freq, experienceLevel: level as any, equipment })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgb(var(--bg-primary))' }}>
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ backgroundColor: SURF, borderBottom: `1px solid ${BORD}` }}>
        <h2 className="font-display text-xl font-semibold">Configurar rutina</h2>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: ELEV, color: MUT }}><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 max-w-lg mx-auto w-full space-y-7">

        {/* Goal */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: MUT }}>Objetivo</p>
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
          <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: MUT }}>
            Días por semana — <span style={{ color: A }}>{freq} días</span>
          </p>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map(n => (
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
          <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: MUT }}>Nivel</p>
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

        {/* Equipment — multi-select */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-1 font-semibold" style={{ color: MUT }}>
            Equipamiento disponible
          </p>
          <p className="text-xs mb-3" style={{ color: MUT }}>
            Seleccioná todo lo que tenés acceso. Se usará para filtrar ejercicios.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {EQUIPMENT_OPTIONS.map(e => {
              const sel = equipment.includes(e.value)
              return (
                <button key={e.value} onClick={() => toggleEq(e.value)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: sel ? 'rgba(201,168,76,0.12)' : ELEV,
                    border: `1.5px solid ${sel ? A : BORD}`,
                    color: sel ? A : MUT,
                  }}>
                  <span className="text-lg">{e.emoji}</span>
                  <span className="flex-1 text-left">{e.label}</span>
                  {sel && <Check size={14} style={{ color: A }} />}
                </button>
              )
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: MUT }}>
            Seleccionado: {equipment.map(eq => EQUIPMENT_OPTIONS.find(o => o.value === eq)?.label).filter(Boolean).join(', ')}
          </p>
        </div>

        <button onClick={handle} disabled={loading || equipment.length === 0}
          className="w-full py-5 text-black font-bold text-lg rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50"
          style={{ backgroundColor: A }}>
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Eye size={20} />}
          Ver previsualización
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Preview + customize exercises ────────────────────────────────────
function PreviewStep({
  preview,
  allExercises,
  onConfirm,
  onBack,
  loading,
}: {
  preview:      GeneratedRoutine
  allExercises: any[]
  onConfirm:    (routine: GeneratedRoutine) => void
  onBack:       () => void
  loading:      boolean
}) {
  const [routine, setRoutine] = useState<GeneratedRoutine>(preview)
  const [editingDay, setEditingDay]     = useState<number | null>(null)
  const [editingExIdx, setEditingExIdx] = useState<number | null>(null)
  const [exSearch, setExSearch]         = useState('')

  const replaceExercise = (dayIdx: number, exIdx: number, newEx: any) => {
    setRoutine(r => ({
      ...r,
      days: r.days.map((d, di) =>
        di !== dayIdx ? d : {
          ...d,
          exercises: d.exercises.map((e, ei) =>
            ei !== exIdx ? e : {
              ...e,
              exercise_id:  newEx.id,
              name:         newEx.name,
              muscle_group: newEx.muscle_group,
            }
          ),
        }
      ),
    }))
    setEditingDay(null)
    setEditingExIdx(null)
    setExSearch('')
  }

  const filteredExercises = allExercises.filter(e =>
    exSearch.length > 0 &&
    (e.name.toLowerCase().includes(exSearch.toLowerCase()) ||
     e.muscle_group.toLowerCase().includes(exSearch.toLowerCase()))
  ).slice(0, 8)

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgb(var(--bg-primary))' }}>
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ backgroundColor: SURF, borderBottom: `1px solid ${BORD}` }}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm" style={{ color: MUT }}>
          <ArrowLeft size={15} /> Volver
        </button>
        <h2 className="font-display text-lg font-semibold">{routine.name}</h2>
        <button onClick={() => onConfirm(routine)} disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-black disabled:opacity-50"
          style={{ backgroundColor: A }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar
        </button>
      </div>

      {/* Exercise picker overlay */}
      {editingDay !== null && editingExIdx !== null && (
        <div className="absolute inset-0 z-10 flex flex-col"
          style={{ backgroundColor: 'rgb(var(--bg-primary))' }}>
          <div className="flex items-center gap-3 px-5 py-4"
            style={{ backgroundColor: SURF, borderBottom: `1px solid ${BORD}` }}>
            <button onClick={() => { setEditingDay(null); setEditingExIdx(null); setExSearch('') }}
              style={{ color: MUT }}><ArrowLeft size={16} /></button>
            <p className="text-sm font-semibold">Reemplazar ejercicio</p>
          </div>
          <div className="px-4 pt-4">
            <input
              value={exSearch}
              onChange={e => setExSearch(e.target.value)}
              placeholder="Buscar por nombre o músculo…"
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: SURF, border: `1px solid ${BORD}`, color: FG }}
            />
          </div>
          <div className="flex-1 overflow-y-auto px-4 pt-3">
            {exSearch.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: MUT }}>
                Escribí para buscar ejercicios…
              </p>
            ) : filteredExercises.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: MUT }}>Sin resultados</p>
            ) : (
              <div className="space-y-2">
                {filteredExercises.map(ex => (
                  <button key={ex.id}
                    onClick={() => replaceExercise(editingDay, editingExIdx, ex)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                    style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
                    <span className="text-xl">{getMuscleEmoji(ex.muscle_group)}</span>
                    <div>
                      <p className="text-sm font-medium">{ex.name}</p>
                      <p className="text-xs" style={{ color: MUT }}>
                        {ex.muscle_group} · {ex.equipment}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-lg mx-auto w-full">
        <p className="text-sm mb-5" style={{ color: MUT }}>{routine.description}</p>
        <p className="text-xs mb-4" style={{ color: MUT }}>
          Tocá el lápiz en cualquier ejercicio para reemplazarlo por otro.
        </p>

        {routine.days.map((day, dayIdx) => (
          <DayCard
            key={dayIdx}
            day={day}
            dayIdx={dayIdx}
            onEditExercise={(exIdx) => { setEditingDay(dayIdx); setEditingExIdx(exIdx) }}
          />
        ))}
      </div>
    </div>
  )
}

function DayCard({ day, dayIdx, onEditExercise }: {
  day: GeneratedDay; dayIdx: number; onEditExercise: (exIdx: number) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-2xl overflow-hidden mb-3"
      style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4">
        <div className="text-left">
          <p className="font-semibold">{day.label}</p>
          <p className="text-xs mt-0.5" style={{ color: MUT }}>{day.exercises.length} ejercicios</p>
        </div>
        {open ? <ChevronUp size={15} style={{ color: MUT }} /> : <ChevronDown size={15} style={{ color: MUT }} />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2" style={{ borderTop: `1px solid ${BORD}` }}>
          {day.exercises.map((ex, exIdx) => (
            <div key={exIdx} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: ELEV }}>
              <span className="text-lg">{getMuscleEmoji(ex.muscle_group)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ex.name}</p>
                <p className="text-xs" style={{ color: MUT }}>
                  {ex.target_sets} × {ex.target_reps} · {ex.target_rest_seconds}s desc.
                </p>
              </div>
              <button onClick={() => onEditExercise(exIdx)}
                className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
                style={{ backgroundColor: SURF, color: MUT }}>
                <Pencil size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main RoutinesClient ───────────────────────────────────────────────────────
type FlowStep = 'view' | 'config' | 'preview'

export function RoutinesClient({ userId, profile, routine, routineHistory, allExercises }: any) {
  const router   = useRouter()
  const supabase = createClient()

  const [step,        setStep]        = useState<FlowStep>('view')
  const [configParams,setConfigParams]= useState<RegenerateParams | null>(null)
  const [preview,     setPreview]     = useState<GeneratedRoutine | null>(null)
  const [loadingPrev, setLoadingPrev] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)

  const [activeWorkoutDay, setActiveWorkoutDay] = useState<any | null>(null)
  const [lastPerf,         setLastPerf]         = useState<Record<string,any[]>>({})
  const [showHistory,      setShowHistory]      = useState(false)

  const routineDays    = routine?.routine_days ?? []
  const today          = new Date().getDay()
  const todayDay       = routineDays.find((d: any) => d.day_of_week === today) ?? null
  const todayExercises = todayDay
    ? [...(todayDay.routine_exercises ?? [])].sort((a: any, b: any) => a.order_index - b.order_index)
    : []

  const startWorkoutDay = async (day: any) => {
    const exIds = (day.routine_exercises ?? []).map((re: any) => re.exercise_id)
    if (exIds.length > 0) {
      const { data } = await supabase
        .from('workout_sets')
        .select('*, session:workout_sessions!inner(user_id,status,finished_at)')
        .in('exercise_id', exIds)
        .eq('session.user_id', userId)
        .eq('session.status', 'completed')
        .order('session.finished_at', { ascending: false })
        .limit(200)
      const perf: Record<string,any[]> = {}
      for (const s of (data ?? []) as any[]) {
        if (!perf[s.exercise_id]) perf[s.exercise_id] = []
        if (perf[s.exercise_id].length < 6) perf[s.exercise_id].push(s)
      }
      setLastPerf(perf)
    }
    setActiveWorkoutDay(day)
  }

  // Step: config → preview
  const handleConfigNext = async (params: RegenerateParams) => {
    setConfigParams(params)
    setLoadingPrev(true)
    const prev = await previewRoutine(supabase, params)
    setPreview(prev)
    setLoadingPrev(false)
    setStep('preview')
  }

  // Step: preview → save
  const handleConfirm = async (finalRoutine: GeneratedRoutine) => {
    if (!configParams) return
    setLoadingSave(true)
    // Deactivate current
    await supabase
      .from('routines')
      .update({ is_active: false, superseded_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true)

    const { error } = await saveGeneratedRoutine(supabase, userId, finalRoutine)
    if (!error) {
      // Save profile config
      await supabase.from('profiles').update({
        fitness_goal:           configParams.goal,
        weekly_frequency:       configParams.weeklyFrequency,
        experience_level:       configParams.experienceLevel,
        equipment:              configParams.equipment,
        last_goal_config:       configParams,
        updated_preferences_at: new Date().toISOString(),
        onboarding_completed:   true,
      }).eq('id', userId)

      setStep('view')
      router.refresh()
    }
    setLoadingSave(false)
  }

  return (
    <>
      {activeWorkoutDay && (
        <QuickWorkout
          userId={userId} routine={routine} todayDay={activeWorkoutDay}
          todayExercises={[...(activeWorkoutDay.routine_exercises ?? [])].sort((a: any,b: any) => a.order_index - b.order_index)}
          lastPerf={lastPerf}
          onClose={() => setActiveWorkoutDay(null)} />
      )}

      {step === 'config' && (
        <ConfigStep
          profile={configParams ? { ...profile, ...configParams } : profile}
          onNext={handleConfigNext}
          onClose={() => setStep('view')} />
      )}

      {step === 'preview' && preview && (
        <PreviewStep
          preview={preview}
          allExercises={allExercises ?? []}
          onConfirm={handleConfirm}
          onBack={() => setStep('config')}
          loading={loadingSave} />
      )}

      {/* ── Main view ── */}
      <div className="p-5 md:p-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-semibold">Mis Rutinas</h1>
          <button onClick={() => setStep('config')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: SURF, border: `1px solid ${BORD}`, color: A }}>
            {routine ? <><Sliders size={14} /> Ajustar</> : <><Plus size={14} /> Nueva rutina</>}
          </button>
        </div>

        {routine ? (
          <>
            {/* Active routine info */}
            <div className="rounded-2xl p-5 mb-5"
              style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xs uppercase tracking-widest" style={{ color: A }}>Rutina activa</span>
                  <h2 className="font-display text-xl font-semibold mt-0.5">{routine.name}</h2>
                  {routine.description && (
                    <p className="text-sm mt-1" style={{ color: MUT }}>{routine.description}</p>
                  )}
                </div>
                <span className="text-xs px-2 py-1 rounded-full ml-3 flex-shrink-0"
                  style={{ backgroundColor: 'rgba(201,168,76,0.12)', color: A }}>
                  v{routine.version ?? 1}
                </span>
              </div>
              {/* Config tags */}
              {profile && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    GOALS.find(g => g.value === profile.fitness_goal)?.label,
                    profile.weekly_frequency ? `${profile.weekly_frequency}d/sem` : null,
                    LEVELS.find(l => l.value === profile.experience_level)?.label,
                  ].filter(Boolean).map(t => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: ELEV, color: MUT }}>{t}</span>
                  ))}
                  {/* Equipment tags */}
                  {Array.isArray(profile.equipment) && profile.equipment.slice(0,3).map((eq: string) => (
                    <span key={eq} className="text-xs px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: ELEV, color: MUT }}>
                      {EQUIPMENT_OPTIONS.find(o => o.value === eq)?.label ?? eq}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly calendar */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Planificación semanal</h3>
              <WeeklyCalendar
                routineDays={routineDays}
                routineName={routine.name}
                onStartDay={startWorkoutDay} />
            </div>

            {/* Routine history */}
            {routineHistory.length > 0 && (
              <div>
                <button onClick={() => setShowHistory(h => !h)}
                  className="flex items-center justify-between w-full mb-3">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <History size={14} style={{ color: MUT }} />
                    Rutinas anteriores ({routineHistory.length})
                  </span>
                  <ChevronRight size={14} style={{
                    color: MUT,
                    transform: showHistory ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s'
                  }} />
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
                              ? `Reemplazada ${new Date(r.superseded_at).toLocaleDateString('es',{day:'numeric',month:'short'})}`
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
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📋</p>
            <p className="font-display text-2xl font-semibold mb-2">Sin rutina activa</p>
            <p className="text-sm mb-8" style={{ color: MUT }}>
              Generá tu primera rutina personalizada en base a tus objetivos.
            </p>
            <button onClick={() => setStep('config')}
              className="px-8 py-4 text-black font-bold text-base rounded-2xl inline-flex items-center gap-3"
              style={{ backgroundColor: A }}>
              <Plus size={18} /> Crear primera rutina
            </button>
          </div>
        )}
      </div>
    </>
  )
}
