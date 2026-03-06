import { createServerClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const today = new Date().getDay()
  const { data: routine } = await supabase.from('routines')
    .select('*, routine_days(*, routine_exercises(*, exercise:exercises(*)))')
    .eq('user_id', session.user.id).eq('is_active', true).single()
  const { data: recentSessions } = await supabase.from('workout_sessions')
    .select('*, routine:routines(name), workout_sets(weight_kg, reps, exercise_id, exercise:exercises(id,name,muscle_group))')
    .eq('user_id', session.user.id).eq('status', 'completed')
    .order('finished_at', { ascending: false }).limit(3)
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { count } = await supabase.from('workout_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id).eq('status', 'completed').gte('finished_at', start)
  const r = routine as any
  const todayDay = r?.routine_days?.find((d: any) => d.day_of_week === today) ?? null
  return <DashboardClient routine={r} todayDay={todayDay} recentSessions={(recentSessions ?? []) as any[]} sessionsThisMonth={count ?? 0} userId={session.user.id} />
}
