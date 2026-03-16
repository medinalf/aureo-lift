import { createServerClient } from '@/lib/supabase/server'
import { RoutinesClient } from '@/components/routines/routines-client'

export default async function RoutinesPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const [profileRes, routineRes, historyRes, exercisesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('fitness_goal, weekly_frequency, experience_level, equipment, last_goal_config')
      .eq('id', session.user.id)
      .single(),

    supabase
      .from('routines')
      .select('*, routine_days(*, routine_exercises(*, exercise:exercises(*)))')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),

    supabase
      .from('routines')
      .select('id, name, created_at, superseded_at, version')
      .eq('user_id', session.user.id)
      .eq('is_active', false)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('exercises')
      .select('id, name, muscle_group, equipment')
      .order('name'),
  ])

  return (
    <RoutinesClient
      userId={session.user.id}
      profile={profileRes.data as any}
      routine={routineRes.data as any}
      routineHistory={(historyRes.data ?? []) as any[]}
      allExercises={(exercisesRes.data ?? []) as any[]}
    />
  )
}
