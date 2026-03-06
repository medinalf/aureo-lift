import { createServerClient } from '@/lib/supabase/server'
import { OnboardingForm } from '@/components/onboarding/onboarding-form'
import { redirect } from 'next/navigation'

export default async function OnboardingPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: exercises } = await supabase
    .from('exercises').select('*').order('muscle_group').order('name')

  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', session.user.id).single()

  return (
    <OnboardingForm
      userId={session.user.id}
      userName={(profile as any)?.full_name ?? ''}
      exercises={(exercises ?? []) as any[]}
    />
  )
}
