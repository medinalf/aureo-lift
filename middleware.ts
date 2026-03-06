import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC = ['/login', '/register', '/auth/callback']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC.some(p => pathname.startsWith(p))

  // Not logged in → login
  if (!session && !isPublic && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Logged in + public route → check onboarding
  if (session && (isPublic || pathname === '/')) {
    const { data: profile } = await supabase
      .from('profiles').select('onboarding_completed').eq('id', session.user.id).single()
    const done = (profile as any)?.onboarding_completed
    return NextResponse.redirect(new URL(done ? '/dashboard' : '/onboarding', req.url))
  }

  // Logged in + app routes → verify onboarding
  if (session && !isPublic && pathname !== '/onboarding') {
    const { data: profile } = await supabase
      .from('profiles').select('onboarding_completed').eq('id', session.user.id).single()
    const done = (profile as any)?.onboarding_completed
    if (!done) return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // Logged in + /onboarding → if already done, go to dashboard
  if (session && pathname === '/onboarding') {
    const { data: profile } = await supabase
      .from('profiles').select('onboarding_completed').eq('id', session.user.id).single()
    if ((profile as any)?.onboarding_completed) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)'],
}
