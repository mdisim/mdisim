import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const limit = rateLimit({ key: `auth:${ip}`, limit: 10, windowMs: 60_000 })
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Auto-create company + profile on first login
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id, company_id')
          .eq('id', user.id)
          .single()

        if (!existing?.company_id) {
          const domain = user.email?.split('@')[1] ?? 'company'
          const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)

          const { data: company } = await supabase
            .from('companies')
            .insert({ name: companyName + ' Construction' })
            .select('id')
            .single()

          if (company) {
            await supabase.from('profiles').upsert({
              id: user.id,
              company_id: company.id,
              role: 'owner',
            })
          }
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?message=Could not authenticate user`)
}
