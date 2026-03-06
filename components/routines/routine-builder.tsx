'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMuscleGroupLabel, getMuscleEmoji, getDayName } from '@/lib/utils'
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

const DAYS = [1,2,3,4,5,6,0]

export function RoutineBuilder({ userId, exercises }: any) {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [days, setDays] = useState<Record<number, { label: string; exercises: any[] }>>({})
  const [openDay, setOpenDay] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const groups = Array.from(new Set(exercises.map((e: any) => e.muscle_group))) as string[]

  const toggleDay = (d: number) => {
    if (days[d]) {
      const n = { ...days }; delete n[d]; setDays(n)
    } else {
      setDays({ ...days, [d]: { label: getDayName(d), exercises: [] } })
      setOpenDay(d)
    }
  }

  const addExercise = (day: number, ex: any) => {
    setDays(prev => ({ ...prev, [day]: { ...prev[day], exercises: [...(prev[day]?.exercises ?? []), { ...ex, target_sets: 3, target_reps: '8-12', target_rest_seconds: 90 }] } }))
  }

  const removeExercise = (day: number, idx: number) => {
    setDays(prev => ({ ...prev, [day]: { ...prev[day], exercises: prev[day].exercises.filter((_: any, i: number) => i !== idx) } }))
  }

  const save = async () => {
    if (!name.trim()) { setError('Ingresa un nombre'); return }
    if (Object.keys(days).length === 0) { setError('Agrega al menos un día'); return }
    setSaving(true); setError('')
    const { data: routine, error: re } = await supabase.from('routines')
      .insert({ user_id: userId, name: name.trim(), description: description.trim() || null, is_active: true })
      .select().single()
    if (re || !routine) { setError('Error al guardar'); setSaving(false); return }
    for (const [dow, dayData] of Object.entries(days)) {
      const { data: rd } = await supabase.from('routine_days')
        .insert({ routine_id: (routine as any).id, day_of_week: parseInt(dow), day_label: dayData.label })
        .select().single()
      if (!rd) continue
      for (let i = 0; i < dayData.exercises.length; i++) {
        const ex = dayData.exercises[i]
        await supabase.from('routine_exercises').insert({
          routine_day_id: (rd as any).id, exercise_id: ex.id, order_index: i,
          target_sets: ex.target_sets, target_reps: ex.target_reps, target_rest_seconds: ex.target_rest_seconds
        })
      }
    }
    router.push('/routines'); router.refresh()
  }

  const IS = { backgroundColor: 'rgb(var(--bg-input))', border: '1px solid rgb(var(--border))', color: 'rgb(var(--foreground))' }
  const filtered = exercises.filter((e: any) => e.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgb(var(--muted))' }}>Nueva rutina</p>
        <h1 className="font-display text-3xl font-semibold">Constructor</h1>
      </div>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--muted))' }}>Nombre *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Push Pull Legs, 5/3/1..." className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none" style={IS} />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--muted))' }}>Descripción</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Opcional" className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none" style={IS} />
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'rgb(var(--muted))' }}>Días de entrenamiento</p>
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {DAYS.map(d => (
            <button key={d} onClick={() => toggleDay(d)}
              className="py-3 rounded-xl text-xs font-semibold transition-colors"
              style={{ backgroundColor: days[d] ? 'rgb(var(--accent))' : 'rgb(var(--bg-elevated))', color: days[d] ? 'black' : 'rgb(var(--muted))' }}>
              {getDayName(d, true)}
            </button>
          ))}
        </div>

        {Object.entries(days).sort(([a], [b]) => {
          const order = [1,2,3,4,5,6,0]; return order.indexOf(parseInt(a)) - order.indexOf(parseInt(b))
        }).map(([dow, dayData]) => (
          <div key={dow} className="rounded-2xl mb-3 overflow-hidden" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--border))' }}>
            <button onClick={() => setOpenDay(openDay === parseInt(dow) ? null : parseInt(dow))}
              className="w-full flex items-center justify-between px-5 py-4">
              <div>
                <span className="font-semibold text-sm">{getDayName(parseInt(dow))}</span>
                <span className="text-xs ml-2" style={{ color: 'rgb(var(--muted))' }}>{dayData.exercises.length} ejercicios</span>
              </div>
              {openDay === parseInt(dow) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {openDay === parseInt(dow) && (
              <div className="px-5 pb-5" style={{ borderTop: '1px solid rgb(var(--border))' }}>
                {dayData.exercises.length > 0 && (
                  <div className="my-3 space-y-2">
                    {dayData.exercises.map((ex: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ backgroundColor: 'rgb(var(--bg-elevated))' }}>
                        <span className="text-lg">{getMuscleEmoji(ex.muscle_group)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{ex.name}</div>
                          <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{ex.target_sets}×{ex.target_reps}</div>
                        </div>
                        <button onClick={() => removeExercise(parseInt(dow), i)} style={{ color: 'rgb(var(--danger))' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3">
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ejercicio..." className="w-full px-3 py-2 text-sm rounded-xl mb-3 focus:outline-none" style={IS} />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {groups.map(g => {
                      const gEx = filtered.filter((e: any) => e.muscle_group === g)
                      if (!gEx.length) return null
                      return (
                        <div key={g}>
                          <p className="text-xs uppercase tracking-widest px-2 py-1" style={{ color: 'rgb(var(--muted))' }}>{getMuscleGroupLabel(g)}</p>
                          {gEx.map((ex: any) => (
                            <button key={ex.id} onClick={() => addExercise(parseInt(dow), ex)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm hover:bg-opacity-80 transition-colors"
                              style={{ backgroundColor: 'transparent' }}>
                              <span>{getMuscleEmoji(ex.muscle_group)}</span>
                              <span>{ex.name}</span>
                              <Plus size={12} className="ml-auto" style={{ color: 'rgb(var(--accent))' }} />
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(224,83,83,0.1)', color: 'rgb(var(--danger))' }}>{error}</p>}
      <button onClick={save} disabled={saving} className="w-full py-4 text-black font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: 'rgb(var(--accent))' }}>
        {saving && <Loader2 size={16} className="animate-spin" />} Guardar Rutina
      </button>
    </div>
  )
}
