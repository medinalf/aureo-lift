import { createServerClient } from '@/lib/supabase/server'
import { ProgressClient } from '@/components/charts/progress-client'

export default async function ProgressPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  // All 1RM history
  const { data: oneRepHistory } = await supabase
    .from('one_rep_max_history')
    .select('*, exercise:exercises(id,name,muscle_group)')
    .eq('user_id', session.user.id)
    .order('calculated_at', { ascending: true })
    .limit(500)

  // Volume per session (last 30)
  const { data: sessionVols } = await supabase
    .from('workout_sessions')
    .select('id, finished_at, routine:routines(name), workout_sets(weight_kg, reps)')
    .eq('user_id', session.user.id)
    .eq('status', 'completed')
    .order('finished_at', { ascending: false })
    .limit(30)

  // Sessions per week (last 12 weeks)
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)
  const { data: weekSessions } = await supabase
    .from('workout_sessions')
    .select('finished_at')
    .eq('user_id', session.user.id)
    .eq('status', 'completed')
    .gte('finished_at', twelveWeeksAgo.toISOString())

  return (
    <ProgressClient
      oneRepHistory={(oneRepHistory ?? []) as any[]}
      sessionVols={([...(sessionVols ?? [])] as any[]).reverse()}
      weekSessions={(weekSessions ?? []) as any[]}
    />
  )
}
