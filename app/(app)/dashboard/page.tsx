import { createServerClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const today = new Date().getDay() // 0=Sun…6=Sat

  // ── Active routine + today's day ──────────────────────────────────────────
  const { data: routine } = await supabase
    .from('routines')
    .select('*, routine_days(*, routine_exercises(*, exercise:exercises(*)))')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .single() as any

  const todayDay = routine?.routine_days?.find((d: any) => d.day_of_week === today) ?? null
  const todayExercises = todayDay
    ? [...(todayDay.routine_exercises ?? [])].sort((a: any, b: any) => a.order_index - b.order_index)
    : []

  // ── Last 3 completed sessions ─────────────────────────────────────────────
  const { data: recentSessions } = await supabase
    .from('workout_sessions')
    .select('*, routine:routines(name), workout_sets(*, exercise:exercises(id,name,muscle_group))')
    .eq('user_id', session.user.id)
    .eq('status', 'completed')
    .order('finished_at', { ascending: false })
    .limit(3)

  const sessions = (recentSessions ?? []) as any[]
  const lastSession = sessions[0] ?? null

  // ── Last perf for today's exercises ──────────────────────────────────────
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
      if (lastPerf[s.exercise_id].length < 8) lastPerf[s.exercise_id].push(s)
    }
  }

  // ── Weekly volume ─────────────────────────────────────────────────────────
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0,0,0,0)

  const { data: weekSets } = await supabase
    .from('workout_sets')
    .select('weight_kg, reps, session:workout_sessions!inner(user_id, status, finished_at)')
    .eq('session.user_id', session.user.id)
    .eq('session.status', 'completed')
    .gte('session.finished_at', weekStart.toISOString())

  const weeklyVolume = ((weekSets ?? []) as any[])
    .reduce((a, s) => a + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)

  // ── Best 1RM per key exercise (top exercise from today or all) ────────────
  let topExercise1RM: { name: string; current: number; previous: number } | null = null
  const keyExId = todayExercises[0]?.exercise_id
  if (keyExId) {
    const { data: hist } = await supabase
      .from('one_rep_max_history')
      .select('one_rep_max, calculated_at')
      .eq('user_id', session.user.id)
      .eq('exercise_id', keyExId)
      .order('calculated_at', { ascending: false })
      .limit(20)

    if (hist && hist.length >= 2) {
      topExercise1RM = {
        name: todayExercises[0]?.exercise?.name ?? '',
        current: (hist[0] as any).one_rep_max,
        previous: (hist[hist.length - 1] as any).one_rep_max,
      }
    }
  }

  return (
    <DashboardClient
      userId={session.user.id}
      routine={routine}
      todayDay={todayDay}
      todayExercises={todayExercises}
      lastPerf={lastPerf}
      recentSessions={sessions}
      lastSession={lastSession}
      weeklyVolume={weeklyVolume}
      topExercise1RM={topExercise1RM}
    />
  )
}
