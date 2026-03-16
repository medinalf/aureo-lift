import { SupabaseClient } from '@supabase/supabase-js'
import { generateRoutine, Goal, Level, mapProfileEquipmentToDb, GeneratedRoutine } from './routine-generator'

export interface RegenerateParams {
  goal:              Goal
  weeklyFrequency:   number
  experienceLevel:   Level
  equipment:         string[]   // profile strings: 'barbell','dumbbells','machines','cables','bodyweight','kettlebells'
}

/** Save a GeneratedRoutine into the DB under a given userId. Returns routineId. */
export async function saveGeneratedRoutine(
  supabase:    SupabaseClient,
  userId:      string,
  routineData: GeneratedRoutine
): Promise<{ routineId: string | null; error: string | null }> {

  const { data: newRoutine, error: routineErr } = await supabase
    .from('routines')
    .insert({ user_id: userId, name: routineData.name, description: routineData.description, is_active: true, version: 1 })
    .select()
    .single()

  if (routineErr || !newRoutine) return { routineId: null, error: routineErr?.message ?? 'Error' }
  const routineId = (newRoutine as any).id

  for (const day of routineData.days) {
    const { data: newDay } = await supabase
      .from('routine_days')
      .insert({ routine_id: routineId, day_of_week: day.day_of_week, day_label: day.label, order_index: day.day_of_week })
      .select().single()
    if (!newDay) continue
    const dayId = (newDay as any).id
    for (const ex of day.exercises) {
      if (!ex.exercise_id) continue
      await supabase.from('routine_exercises').insert({
        routine_day_id: dayId,
        exercise_id:    ex.exercise_id,
        order_index:    ex.order_index,
        target_sets:    ex.target_sets,
        target_reps:    ex.target_reps,
        rest_seconds:   ex.target_rest_seconds,
      })
    }
  }
  return { routineId, error: null }
}

/**
 * Deactivates current routine, generates a new one, saves it, updates profile.
 * Returns the preview data so the UI can show it before committing.
 */
export async function regenerateRoutine(
  supabase:  SupabaseClient,
  userId:    string,
  params:    RegenerateParams
): Promise<{ routineId: string | null; error: string | null }> {
  try {
    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, name, muscle_group, equipment')

    const dbEquipment = mapProfileEquipmentToDb(params.equipment)
    const routineData = generateRoutine(
      { goal: params.goal, frequency: params.weeklyFrequency, level: params.experienceLevel, equipment: dbEquipment },
      (exercises ?? []) as any[]
    )

    // Deactivate existing
    await supabase
      .from('routines')
      .update({ is_active: false, superseded_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true)

    const result = await saveGeneratedRoutine(supabase, userId, routineData)
    if (result.error) return result

    // Save profile config
    await supabase.from('profiles').update({
      fitness_goal:            params.goal,
      weekly_frequency:        params.weeklyFrequency,
      experience_level:        params.experienceLevel,
      equipment:               params.equipment,
      last_goal_config:        params,
      updated_preferences_at:  new Date().toISOString(),
      onboarding_completed:    true,
    }).eq('id', userId)

    return result
  } catch (e: any) {
    return { routineId: null, error: e?.message ?? 'Error desconocido' }
  }
}

/** Preview only — generates the routine structure without saving to DB */
export async function previewRoutine(
  supabase: SupabaseClient,
  params:   RegenerateParams
): Promise<GeneratedRoutine | null> {
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, equipment')
  const dbEquipment = mapProfileEquipmentToDb(params.equipment)
  return generateRoutine(
    { goal: params.goal, frequency: params.weeklyFrequency, level: params.experienceLevel, equipment: dbEquipment },
    (exercises ?? []) as any[]
  )
}
