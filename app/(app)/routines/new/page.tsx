import { createServerClient } from '@/lib/supabase/server'
import { RoutineBuilder } from '@/components/routines/routine-builder'
export default async function NewRoutinePage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: exercises } = await supabase.from('exercises').select('*')
    .or(`user_id.is.null,user_id.eq.${session.user.id}`).order('muscle_group').order('name')
  return <RoutineBuilder userId={session.user.id} exercises={(exercises ?? []) as any[]} />
}
