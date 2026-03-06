import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Workout is now handled as a modal from the dashboard.
// This page redirects to dashboard.
export default async function WorkoutPage() {
  redirect('/dashboard')
}
