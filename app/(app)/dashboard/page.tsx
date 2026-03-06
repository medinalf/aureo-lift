import { createServerClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const today = new Date().getDay()

  // Active routine with today's day
  const { data: routine } = await supabase
    .from('routines')
    .select('*, routine_days(*, routine_exercises(*, exercise:exercises(*)))')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .single()

  const r = routine as any
  const todayDay = r?.routine_days?.find((d: any) => d.day_of_week === today) ?? null
  const todayExercises = todayDay
    ? [...(todayDay.routine_exercises ?? [])].sort((a: any, b: any) => a.order_index - b.order_index)
    : []

  // Last 3 completed sessions
  const { data: recentSessions } = await supabase
    .from('workout_sessions')
    .select('*, routine:routines(name), workout_sets(*, exercise:exercises(id, name, muscle_group))')
    .eq('user_id', session.user.id)
    .eq('status', 'completed')
    .order('finished_at', { ascending: false })
    .limit(3)

  const sessions = (recentSessions ?? []) as any[]
  const lastSession = sessions[0] ?? null

  // For each exercise today, find last performance
  const exerciseIds = todayExercises.map((re: any) => re.exercise_id)
  let lastPerf: Record<string, any[]> = {}

  if (exerciseIds.length > 0) {
    const { data: prevSets } = await supabase
      .from('workout_sets')
      .select('*, session:workout_sessions!inner(user_id, status, finished_at)')
      .in('exercise_id', exerciseIds)
      .eq('session.user_id', session.user.id)
      .eq('session.status', 'completed')
      .order('session.finished_at', { ascending: false })
      .limit(200)

    for (const s of (prevSets ?? []) as any[]) {
      if (!lastPerf[s.exercise_id]) lastPerf[s.exercise_id] = []
      if (lastPerf[s.exercise_id].length < 6) lastPerf[s.exercise_id].push(s)
    }
  }

  // Weekly volume
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const { data: weekSets } = await supabase
    .from('workout_sets')
    .select('weight_kg, reps, session:workout_sessions!inner(user_id, status, finished_at)')
    .eq('session.user_id', session.user.id)
    .eq('session.status', 'completed')
    .gte('session.finished_at', weekStart.toISOString())

  const weeklyVolume = ((weekSets ?? []) as any[])
    .reduce((a, s) => a + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)

  return (
    <DashboardClient
      userId={session.user.id}
      routine={r}
      todayDay={todayDay}
      todayExercises={todayExercises}
      lastPerf={lastPerf}
      recentSessions={sessions}
      lastSession={lastSession}
      weeklyVolume={weeklyVolume}
    />
  )
}
