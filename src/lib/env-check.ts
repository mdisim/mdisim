export const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

export const OPTIONAL_ENV = [
  { key: 'RESEND_API_KEY', description: 'Resend API key for email notifications' },
  { key: 'RESEND_FROM_EMAIL', description: 'From address (e.g. noreply@yourdomain.com)' },
  { key: 'NEXT_PUBLIC_APP_URL', description: 'Production URL (e.g. https://angeldc.app)' },
  { key: 'SENTRY_DSN', description: 'Sentry DSN for error monitoring' },
] as const
