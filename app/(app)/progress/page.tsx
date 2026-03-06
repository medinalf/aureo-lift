import { createServerClient } from '@/lib/supabase/server'
import { ProgressClient } from '@/components/charts/progress-client'
export default async function ProgressPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: sets } = await supabase.from('workout_sets')
    .select('exercise_id, exercise:exercises(id, name, muscle_group)').not('weight_kg', 'is', null).limit(500)
  const seen = new Set<string>()
  const exercises = ((sets ?? []) as any[])
    .filter((r: any) => { if (!r.exercise || seen.has(r.exercise_id)) return false; seen.add(r.exercise_id); return true })
    .map((r: any) => r.exercise)
  return <ProgressClient userId={session.user.id} exercises={exercises} />
}
