import { createServerClient } from '@/lib/supabase/server'
import { WorkoutClient } from '@/components/workout/workout-client'
export default async function WorkoutPage({ searchParams }: { searchParams: { routineId?: string } }) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  let routine = null
  if (searchParams.routineId) {
    const { data } = await supabase.from('routines')
      .select('*, routine_days(*, routine_exercises(*, exercise:exercises(*)))')
      .eq('id', searchParams.routineId).eq('user_id', session.user.id).single()
    routine = data
  }
  return <WorkoutClient userId={session.user.id} routine={routine as any} />
}
