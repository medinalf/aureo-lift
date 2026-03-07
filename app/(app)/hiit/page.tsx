import { createServerClient } from '@/lib/supabase/server'
import { HIITClient } from '@/components/workout/hiit-client'

export default async function HIITPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  return <HIITClient userId={session?.user?.id} />
}
