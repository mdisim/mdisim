import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const COOKIE_NAME = 'angel-dc-api-key'

export async function GET() {
  const cookieStore = await cookies()
  const apiKey = cookieStore.get(COOKIE_NAME)?.value
  return Response.json({ configured: !!apiKey })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { apiKey } = body as { apiKey: string }

  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    return Response.json(
      { error: 'Invalid API key. Must start with sk-ant-' },
      { status: 400 },
    )
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, apiKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })

  return Response.json({ success: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  return Response.json({ success: true })
}
