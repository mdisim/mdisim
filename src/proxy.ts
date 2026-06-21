import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ADMIN_ONLY = ['/settings']
const PM_AND_ABOVE = ['/tenders', '/executive', '/infrastructure']
const COMPANY_ONLY = ['/team', '/contractors', '/tenders']
const STUDENT_ALLOWED = ['/student', '/dashboard', '/settings', '/calculators', '/onboarding']

export async function proxy(request: NextRequest) {
  // First run the standard session update (handles auth redirects)
  const response = await updateSession(request)

  // If already redirecting to login, skip RBAC
  if (response.headers.get('location')?.includes('/login')) {
    return response
  }

  const pathname = request.nextUrl.pathname

  // Skip RBAC for auth-related routes, onboarding, and API routes
  if (pathname.startsWith('/api/') || pathname === '/onboarding' || pathname.startsWith('/_next')) {
    return response
  }

  // Get user from cookies to check role and account type
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

  const role: string | undefined = user.user_metadata?.role as string | undefined
  const COMPANY_ROLES = ['super_admin', 'company_admin', 'project_manager', 'quantity_surveyor', 'site_engineer', 'viewer']
  const accountType: string | undefined = role === 'student' ? 'student' : role === 'engineer' ? 'engineer' : (role && COMPANY_ROLES.includes(role)) ? 'company' : undefined

  // Redirect to onboarding if no account type set (for dashboard routes)
  if (!accountType && pathname.startsWith('/') && !pathname.startsWith('/onboarding') && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
    const isDashboardRoute = !pathname.startsWith('/api/') && !pathname.startsWith('/_next')
    if (isDashboardRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  // Account type route protection
  if (accountType === 'student') {
    const isAllowed = STUDENT_ALLOWED.some(r => pathname.startsWith(r))
    if (!isAllowed && pathname !== '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/student'
      return NextResponse.redirect(url)
    }
  }

  if (accountType === 'engineer') {
    // Engineers cannot access company-only admin pages
    if (COMPANY_ONLY.some(r => pathname.startsWith(r))) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Role-based access control (within company accounts)
  const isAdminRoute = ADMIN_ONLY.some(r => pathname.startsWith(r))
  const isPMRoute = PM_AND_ABOVE.some(r => pathname.startsWith(r))

  if (isAdminRoute && (!role || !['super_admin', 'company_admin'].includes(role))) {
    const url = request.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

  if (isPMRoute && role && ['viewer', 'site_engineer'].includes(role)) {
    const url = request.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
