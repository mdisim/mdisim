import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@angeldc.app'
export const APP_NAME = 'ANGEL D.C.'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://angeldc.app'

export interface EmailResult { success: boolean; error?: string }

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping email send')
    return { success: true }
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
