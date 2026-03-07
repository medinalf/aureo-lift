import { SupabaseClient } from '@supabase/supabase-js'
import { generateRoutine, Goal, Level, Equipment } from './routine-generator'

export interface RegenerateParams {
  goal: Goal
  weeklyFrequency: number
  experienceLevel: Level
  equipment: string[]   // user's string values from profile
}

// Map profile equipment strings to generator Equipment enum values
function mapEquipment(eq: string[]): Equipment[] {
  if (!eq?.length) return ['full_gym']
  const has = (v: string) => eq.includes(v)
  if (has('barbell') && has('machines') && has('cables')) return ['full_gym']
  if (has('barbell') || has('dumbbells')) return ['home_weights']
  if (has('bodyweight')) return ['calisthenics']
  if (has('kettlebells') || has('dumbbells')) return ['home_weights']
  return ['minimal']
}

export async function regenerateRoutine(
  supabase: SupabaseClient,
  userId: string,
  params: RegenerateParams
): Promise<{ routineId: string | null; error: string | null }> {
  try {
    // 1. Fetch exercises from DB
    const { data: dbExercises } = await supabase
      .from('exercises')
      .select('id, name, muscle_group, equipment_needed')

    const exercises = (dbExercises ?? []) as any[]

    // 2. Generate routine structure
    const mappedEquipment = mapEquipment(params.equipment)
    const routineData = generateRoutine(
      {
        goal: params.goal,
        frequency: params.weeklyFrequency,
        level: params.experienceLevel,
        equipment: mappedEquipment,
      },
      exercises
    )

    // 3. Deactivate current routines
    await supabase
      .from('routines')
      .update({ is_active: false, superseded_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true)

    // 4. Create new routine
    const { data: newRoutine, error: routineErr } = await supabase
      .from('routines')
      .insert({
        user_id: userId,
        name: routineData.name,
        description: routineData.description,
        is_active: true,
        version: 1,
      })
      .select()
      .single()

    if (routineErr || !newRoutine) {
      return { routineId: null, error: routineErr?.message ?? 'Error creating routine' }
    }

    const routineId = (newRoutine as any).id

    // 5. Create days + exercises
    for (const day of routineData.days) {
      const { data: newDay } = await supabase
        .from('routine_days')
        .insert({
          routine_id: routineId,
          day_of_week: day.day_of_week,
          day_label: day.label,
          order_index: day.day_of_week,
        })
        .select()
        .single()

      if (!newDay) continue
      const dayId = (newDay as any).id

      for (const ex of day.exercises) {
        if (!ex.exercise_id) continue
        await supabase.from('routine_exercises').insert({
          routine_day_id: dayId,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
          rest_seconds: ex.target_rest_seconds ?? 90,
        })
      }
    }

    // 6. Save config to profile
    await supabase.from('profiles').update({
      fitness_goal: params.goal,
      weekly_frequency: params.weeklyFrequency,
      experience_level: params.experienceLevel,
      equipment: params.equipment,
      last_goal_config: params,
      updated_preferences_at: new Date().toISOString(),
      onboarding_completed: true,
    }).eq('id', userId)

    return { routineId, error: null }
  } catch (e: any) {
    return { routineId: null, error: e?.message ?? 'Unknown error' }
  }
}
