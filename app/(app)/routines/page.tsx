import { createServerClient } from '@/lib/supabase/server'
import { RoutinesClient } from '@/components/routines/routines-client'

export default async function RoutinesPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('fitness_goal, weekly_frequency, experience_level, equipment, last_goal_config')
    .eq('id', session.user.id)
    .single()

  const { data: routine } = await supabase
    .from('routines')
    .select('*, routine_days(*, routine_exercises(*, exercise:exercises(*)))')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as any

  const { data: routineHistory } = await supabase
    .from('routines')
    .select('id, name, created_at, superseded_at, version')
    .eq('user_id', session.user.id)
    .eq('is_active', false)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <RoutinesClient
      userId={session.user.id}
      profile={profile as any}
      routine={routine as any}
      routineHistory={(routineHistory ?? []) as any[]}
    />
  )
}
