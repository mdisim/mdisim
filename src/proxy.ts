import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ADMIN_ONLY = ['/settings', '/boq-library']
const PM_AND_ABOVE = ['/tenders', '/executive', '/infrastructure']

export async function proxy(request: NextRequest) {
  // First run the standard session update (handles auth redirects)
  const response = await updateSession(request)

  // If already redirecting to login, skip RBAC
  if (response.headers.get('location')?.includes('/login')) {
    return response
  }

  const pathname = request.nextUrl.pathname
  const isProtectedRoute =
    ADMIN_ONLY.some(r => pathname.startsWith(r)) ||
    PM_AND_ABOVE.some(r => pathname.startsWith(r))

  if (!isProtectedRoute) return response

  // Get user from cookies to check role
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return response

  const role: string = (user.user_metadata?.role as string) ?? 'viewer'

  const isAdminRoute = ADMIN_ONLY.some(r => pathname.startsWith(r))
  const isPMRoute = PM_AND_ABOVE.some(r => pathname.startsWith(r))

  if (isAdminRoute && !['super_admin', 'company_admin'].includes(role)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(url)
  }

  if (isPMRoute && ['viewer', 'site_engineer'].includes(role)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
