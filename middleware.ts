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
  if (!session && !isPublic && pathname !== '/') return NextResponse.redirect(new URL('/login', req.url))
  if (session && (isPublic || pathname === '/')) return NextResponse.redirect(new URL('/dashboard', req.url))
  return res
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)'] }
