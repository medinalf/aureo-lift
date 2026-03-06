'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildRoutinePlan, type Goal, type Level, type Equipment, type OnboardingData } from '@/lib/onboarding'
import { Loader2, Check } from 'lucide-react'

// ─── Data ─────────────────────────────────────────────────────────────────────
const GOALS = [
  { value: 'fat_loss',     label: 'Pérdida de Grasa',      desc: 'Quemar grasa manteniendo músculo', icon: '🔥' },
  { value: 'hypertrophy',  label: 'Ganar Masa Muscular',   desc: 'Hipertrofia y volumen',            icon: '💪' },
  { value: 'strength',     label: 'Ganar Fuerza',          desc: 'Levantar más peso, más potencia',  icon: '🏋️' },
  { value: 'maintenance',  label: 'Mantenimiento',         desc: 'Salud general y bienestar',        icon: '⚖️' },
]

const LEVELS = [
  { value: 'beginner',     label: 'Principiante',   desc: 'Poca o ninguna experiencia',     icon: '🌱' },
  { value: 'intermediate', label: 'Intermedio',     desc: '6+ meses entrenando',            icon: '📈' },
  { value: 'advanced',     label: 'Avanzado',       desc: '2+ años entrenando',             icon: '🏆' },
]

const EQUIPMENT_OPTIONS = [
  { value: 'full_gym',     label: 'Gimnasio completo',          icon: '🏢' },
  { value: 'home_weights', label: 'Pesas en casa',              icon: '🏠' },
  { value: 'calisthenics', label: 'Calistenia / Peso corporal', icon: '🤸' },
  { value: 'minimal',      label: 'Mínimo equipamiento',        icon: '⚡' },
  { value: 'none',         label: 'Sin equipamiento',           icon: '🧘' },
]

// ─── Styles ───────────────────────────────────────────────────────────────────
const A = 'rgb(var(--accent))'
const SURF = 'rgb(var(--bg-surface))'
const ELEV = 'rgb(var(--bg-elevated))'
const BORD = 'rgb(var(--border))'
const MUT = 'rgb(var(--muted))'

// ─── Component ────────────────────────────────────────────────────────────────
export function OnboardingForm({ userId, userName, exercises }: {
  userId: string; userName: string; exercises: any[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<Partial<OnboardingData>>({
    fitness_goal: undefined,
    weekly_frequency: undefined,
    experience_level: undefined,
    equipment: [],
  })

  const TOTAL = 4
  const progress = ((step - 1) / (TOTAL - 1)) * 100

  const next = () => setStep(s => Math.min(s + 1, TOTAL))
  const back = () => setStep(s => Math.max(s - 1, 1))

  const toggleEquipment = (val: Equipment) => {
    setData(d => {
      const eq = d.equipment ?? []
      return { ...d, equipment: eq.includes(val) ? eq.filter(e => e !== val) : [...eq, val] }
    })
  }

  const canNext = () => {
    if (step === 1) return !!data.fitness_goal
    if (step === 2) return !!data.weekly_frequency
    if (step === 3) return !!data.experience_level
    return true
  }

  const finish = async () => {
    setSaving(true)
    const payload = data as OnboardingData
    if (!payload.equipment?.length) payload.equipment = ['full_gym']

    // 1. Save profile
    await supabase.from('profiles').update({
      fitness_goal: payload.fitness_goal,
      weekly_frequency: payload.weekly_frequency,
      experience_level: payload.experience_level,
      equipment: payload.equipment,
      onboarding_completed: true,
    }).eq('id', userId)

    // 2. Deactivate previous routines
    await supabase.from('routines').update({ is_active: false }).eq('user_id', userId)

    // 3. Build plan
    const plan = buildRoutinePlan(payload, exercises)

    // 4. Insert routine
    const { data: routine } = await supabase.from('routines').insert({
      user_id: userId, name: plan.routineName, is_active: true,
      description: `Generada automáticamente · ${LEVELS.find(l => l.value === payload.experience_level)?.label}`,
    }).select().single()

    if (routine) {
      for (const day of plan.days) {
        const { data: rd } = await supabase.from('routine_days').insert({
          routine_id: (routine as any).id, day_of_week: day.dayOfWeek, day_label: day.label,
        }).select().single()
        if (!rd) continue
        for (let i = 0; i < day.exercises.length; i++) {
          const ex = exercises.find(e => e.name === day.exercises[i].name)
          if (!ex) continue
          await supabase.from('routine_exercises').insert({
            routine_day_id: (rd as any).id, exercise_id: ex.id, order_index: i,
            target_sets: day.exercises[i].sets, target_reps: day.exercises[i].reps,
            target_rest_seconds: day.exercises[i].rest,
          })
        }
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ backgroundColor: 'rgb(var(--bg-primary))' }}>

      {/* Header */}
      <div className="w-full max-w-lg mb-8">
        <h1 className="font-display text-3xl font-bold text-center mb-1">
          <span style={{ color: A }}>Aureo </span>Lift
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: MUT }}>
          {userName ? `Hola, ${userName.split(' ')[0]} 👋` : 'Configuremos tu rutina personalizada'}
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex-1 h-1 rounded-full transition-all duration-500"
              style={{ backgroundColor: i <= step ? A : BORD }} />
          ))}
        </div>
        <p className="text-xs text-right" style={{ color: MUT }}>Paso {step} de {TOTAL}</p>
      </div>

      <div className="w-full max-w-lg rounded-3xl p-6 md:p-8"
        style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>

        {/* STEP 1 — Goal */}
        {step === 1 && (
          <div className="animate-fade-in">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: MUT }}>Paso 1</p>
            <h2 className="font-display text-2xl font-semibold mb-6">¿Cuál es tu objetivo principal?</h2>
            <div className="grid grid-cols-1 gap-3">
              {GOALS.map(g => {
                const active = data.fitness_goal === g.value
                return (
                  <button key={g.value} onClick={() => setData(d => ({ ...d, fitness_goal: g.value as Goal }))}
                    className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
                    style={{ backgroundColor: active ? `rgba(201,168,76,0.12)` : ELEV, border: `1.5px solid ${active ? A : 'transparent'}` }}>
                    <span className="text-3xl w-10 text-center">{g.icon}</span>
                    <div>
                      <div className="font-semibold text-sm">{g.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: MUT }}>{g.desc}</div>
                    </div>
                    {active && <Check size={16} className="ml-auto flex-shrink-0" style={{ color: A }} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 2 — Frequency */}
        {step === 2 && (
          <div className="animate-fade-in">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: MUT }}>Paso 2</p>
            <h2 className="font-display text-2xl font-semibold mb-2">¿Cuántos días por semana?</h2>
            <p className="text-sm mb-6" style={{ color: MUT }}>Días disponibles para entrenar</p>
            <div className="grid grid-cols-7 gap-2">
              {[1,2,3,4,5,6,7].map(n => {
                const active = data.weekly_frequency === n
                return (
                  <button key={n} onClick={() => setData(d => ({ ...d, weekly_frequency: n }))}
                    className="aspect-square rounded-2xl flex flex-col items-center justify-center font-bold text-xl transition-all"
                    style={{ backgroundColor: active ? A : ELEV, color: active ? 'black' : MUT, border: `1.5px solid ${active ? A : 'transparent'}` }}>
                    {n}
                  </button>
                )
              })}
            </div>
            {data.weekly_frequency && (
              <p className="text-xs mt-4 text-center" style={{ color: A }}>
                {data.weekly_frequency <= 2 && '⚡ Ideal para empezar con calma'}
                {data.weekly_frequency === 3 && '✅ Frecuencia óptima para principiantes e intermedios'}
                {data.weekly_frequency === 4 && '💪 Excelente balance entre estímulo y recuperación'}
                {data.weekly_frequency >= 5 && '🔥 Alta frecuencia — asegurate de dormir y comer bien'}
              </p>
            )}
          </div>
        )}

        {/* STEP 3 — Level + Equipment */}
        {step === 3 && (
          <div className="animate-fade-in">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: MUT }}>Paso 3</p>
            <h2 className="font-display text-2xl font-semibold mb-6">Nivel y equipamiento</h2>

            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: MUT }}>Experiencia</p>
            <div className="grid grid-cols-1 gap-2 mb-6">
              {LEVELS.map(l => {
                const active = data.experience_level === l.value
                return (
                  <button key={l.value} onClick={() => setData(d => ({ ...d, experience_level: l.value as Level }))}
                    className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
                    style={{ backgroundColor: active ? `rgba(201,168,76,0.12)` : ELEV, border: `1.5px solid ${active ? A : 'transparent'}` }}>
                    <span className="text-2xl">{l.icon}</span>
                    <div>
                      <div className="font-semibold text-sm">{l.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: MUT }}>{l.desc}</div>
                    </div>
                    {active && <Check size={16} className="ml-auto" style={{ color: A }} />}
                  </button>
                )
              })}
            </div>

            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: MUT }}>Equipamiento disponible <span className="normal-case">(opcional)</span></p>
            <div className="grid grid-cols-1 gap-2">
              {EQUIPMENT_OPTIONS.map(e => {
                const active = data.equipment?.includes(e.value as Equipment)
                return (
                  <button key={e.value} onClick={() => toggleEquipment(e.value as Equipment)}
                    className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                    style={{ backgroundColor: active ? `rgba(201,168,76,0.12)` : ELEV, border: `1.5px solid ${active ? A : 'transparent'}` }}>
                    <span className="text-xl">{e.icon}</span>
                    <span className="text-sm font-medium">{e.label}</span>
                    {active && <Check size={14} className="ml-auto" style={{ color: A }} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 4 — Summary */}
        {step === 4 && (
          <div className="animate-fade-in">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: MUT }}>Paso 4</p>
            <h2 className="font-display text-2xl font-semibold mb-6">Tu plan personalizado</h2>

            {(() => {
              const plan = buildRoutinePlan(data as OnboardingData, exercises)
              return (
                <>
                  <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: `rgba(201,168,76,0.08)`, border: `1px solid rgba(201,168,76,0.25)` }}>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: A }}>Rutina generada</p>
                    <h3 className="font-display text-xl font-semibold mb-4">{plan.routineName}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl p-3" style={{ backgroundColor: ELEV }}>
                        <div className="text-lg font-bold" style={{ color: A }}>{plan.days.length}</div>
                        <div className="text-xs mt-0.5" style={{ color: MUT }}>días / semana</div>
                      </div>
                      <div className="rounded-xl p-3" style={{ backgroundColor: ELEV }}>
                        <div className="text-lg font-bold" style={{ color: A }}>
                          {plan.days.reduce((a, d) => a + d.exercises.length, 0)}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: MUT }}>ejercicios totales</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {plan.days.map((day, i) => (
                      <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORD}` }}>
                        <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: ELEV }}>
                          <span className="text-sm font-semibold">{day.label}</span>
                          <span className="text-xs" style={{ color: MUT }}>{day.exercises.length} ejercicios</span>
                        </div>
                        <div className="px-4 py-2">
                          {day.exercises.map((ex, j) => (
                            <div key={j} className="flex items-center justify-between py-1.5 text-sm" style={{ borderBottom: j < day.exercises.length - 1 ? `1px solid ${BORD}` : 'none' }}>
                              <span>{ex.name}</span>
                              <span className="text-xs" style={{ color: MUT }}>{ex.sets}×{ex.reps}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs mt-4 text-center" style={{ color: MUT }}>
                    Podés editar o reemplazar esta rutina cuando quieras desde la sección Rutinas.
                  </p>
                </>
              )
            })()}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button onClick={back} className="flex-1 py-3.5 text-sm font-semibold rounded-xl transition-colors"
              style={{ backgroundColor: ELEV, color: MUT }}>
              Atrás
            </button>
          )}
          {step < TOTAL ? (
            <button onClick={next} disabled={!canNext()}
              className="flex-1 py-3.5 text-black font-semibold rounded-xl transition-opacity disabled:opacity-40"
              style={{ backgroundColor: A }}>
              Continuar →
            </button>
          ) : (
            <button onClick={finish} disabled={saving}
              className="flex-1 py-3.5 text-black font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: A }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Creando tu rutina...</> : '🚀 Empezar a entrenar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
