import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Pages that never need auth (and logged-in users should leave)
  const publicOnlyRoutes = ['/', '/login', '/register']
  // Pages accessible to any authenticated user regardless of status
  const statusExemptRoutes = ['/pending', '/suspended']

  if (publicOnlyRoutes.includes(path)) {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('role, status').eq('id', user.id).single()
      if (profile) {
        if (profile.status === 'pending')   return NextResponse.redirect(new URL('/pending',   request.url))
        if (profile.status === 'suspended') return NextResponse.redirect(new URL('/suspended', request.url))
        return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, request.url))
      }
    }
    return supabaseResponse
  }

  // Everything else requires auth
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { data: profile } = await supabase
    .from('profiles').select('role, status').eq('id', user.id).single()

  if (!profile) return NextResponse.redirect(new URL('/login', request.url))

  // Allow access to status-related pages regardless of profile state
  if (statusExemptRoutes.some((r) => path.startsWith(r))) return supabaseResponse

  // Block suspended users everywhere
  if (profile.status === 'suspended') {
    return NextResponse.redirect(new URL('/suspended', request.url))
  }

  // Block pending teachers everywhere except /pending
  if (profile.role === 'teacher' && profile.status === 'pending') {
    return NextResponse.redirect(new URL('/pending', request.url))
  }

  // Role-based route protection
  if (path.startsWith('/admin')   && profile.role !== 'admin')   return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, request.url))
  if (path.startsWith('/teacher') && profile.role !== 'teacher') return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, request.url))
  if (path.startsWith('/student') && profile.role !== 'student') return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, request.url))

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
}
