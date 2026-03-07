import { createServerClient } from '@/lib/supabase/server'
import { HistoryClient } from '@/components/history/history-client'

export default async function HistoryPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('*, routine:routines(name), workout_sets(*, exercise:exercises(id,name,muscle_group))')
    .eq('user_id', session.user.id)
    .eq('status', 'completed')
    .order('finished_at', { ascending: false })
    .limit(60)

  // Exercise list for search filter
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, muscle_group')
    .order('name')

  return (
    <HistoryClient
      sessions={(sessions ?? []) as any[]}
      exercises={(exercises ?? []) as any[]}
    />
  )
}
