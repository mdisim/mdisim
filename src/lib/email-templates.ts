import { APP_NAME, APP_URL } from './email'

const baseStyle = `font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;`
const headerStyle = `background: #1e3a5f; padding: 24px 32px; border-radius: 8px 8px 0 0;`
const bodyStyle = `padding: 32px;`
const footerStyle = `background: #f8fafc; padding: 16px 32px; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;`
const btnStyle = `display: inline-block; background: #f59e0b; color: #000000 !important; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; text-decoration: none; margin: 16px 0;`
const h1Style = `color: #ffffff; margin: 0; font-size: 22px;`
const h2Style = `color: #1e3a5f; margin: 0 0 16px; font-size: 20px;`
const pStyle = `color: #334155; line-height: 1.6; margin: 0 0 16px;`

// APP_URL is used in templates via the imported symbol
void APP_URL

function wrap(content: string): string {
  return `
    <div style="${baseStyle}">
      <div style="${headerStyle}">
        <h1 style="${h1Style}">${APP_NAME}</h1>
        <p style="color:#f59e0b;margin:4px 0 0;font-size:13px;">Construction Management Platform</p>
      </div>
      <div style="${bodyStyle}">${content}</div>
      <div style="${footerStyle}">
        &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.<br/>
        This email was sent from an automated system. Please do not reply.
      </div>
    </div>
  `
}

export function teamInvitationEmail(params: {
  inviterName: string
  companyName: string
  role: string
  inviteUrl: string
}): { subject: string; html: string } {
  return {
    subject: `You've been invited to join ${params.companyName} on ${APP_NAME}`,
    html: wrap(`
      <h2 style="${h2Style}">You're invited!</h2>
      <p style="${pStyle}"><strong>${params.inviterName}</strong> has invited you to join <strong>${params.companyName}</strong> on ${APP_NAME} as a <strong>${params.role.replace('_', ' ')}</strong>.</p>
      <p style="${pStyle}">${APP_NAME} is a professional construction project management platform. Click the button below to accept your invitation and set up your account.</p>
      <a href="${params.inviteUrl}" style="${btnStyle}">Accept Invitation</a>
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
    `),
  }
}

export function passwordResetEmail(params: {
  resetUrl: string
}): { subject: string; html: string } {
  return {
    subject: `Reset your ${APP_NAME} password`,
    html: wrap(`
      <h2 style="${h2Style}">Reset your password</h2>
      <p style="${pStyle}">We received a request to reset the password for your ${APP_NAME} account. Click the button below to choose a new password.</p>
      <a href="${params.resetUrl}" style="${btnStyle}">Reset Password</a>
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    `),
  }
}

export function projectCreatedEmail(params: {
  userName: string
  projectName: string
  projectUrl: string
}): { subject: string; html: string } {
  return {
    subject: `New project created: ${params.projectName}`,
    html: wrap(`
      <h2 style="${h2Style}">New Project Created</h2>
      <p style="${pStyle}">Hi ${params.userName},</p>
      <p style="${pStyle}">A new project <strong>${params.projectName}</strong> has been created on ${APP_NAME}.</p>
      <a href="${params.projectUrl}" style="${btnStyle}">View Project</a>
    `),
  }
}

export function contractorPaymentEmail(params: {
  contractorName: string
  projectName: string
  amount: string
  paymentDate: string
  dashboardUrl: string
}): { subject: string; html: string } {
  return {
    subject: `Payment recorded: ₪${params.amount} — ${params.projectName}`,
    html: wrap(`
      <h2 style="${h2Style}">Payment Recorded</h2>
      <p style="${pStyle}">A payment has been recorded for contractor <strong>${params.contractorName}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b;font-size:13px;">Project</td><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">${params.projectName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b;font-size:13px;">Amount</td><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;color:#059669;">₪${params.amount}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b;font-size:13px;">Date</td><td style="padding:8px;border:1px solid #e2e8f0;">${params.paymentDate}</td></tr>
      </table>
      <a href="${params.dashboardUrl}" style="${btnStyle}">View Dashboard</a>
    `),
  }
}

export function variationApprovedEmail(params: {
  variationNumber: string
  title: string
  amount: string
  projectName: string
  projectUrl: string
  status: 'approved' | 'rejected'
}): { subject: string; html: string } {
  const isApproved = params.status === 'approved'
  return {
    subject: `Variation ${params.variationNumber} ${isApproved ? 'Approved' : 'Rejected'}: ${params.projectName}`,
    html: wrap(`
      <h2 style="${h2Style}">Variation ${isApproved ? 'Approved ✓' : 'Rejected ✗'}</h2>
      <p style="${pStyle}">Variation <strong>${params.variationNumber} — ${params.title}</strong> has been <strong style="color:${isApproved ? '#059669' : '#dc2626'}">${params.status}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b;font-size:13px;">Project</td><td style="padding:8px;border:1px solid #e2e8f0;">${params.projectName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b;font-size:13px;">Amount</td><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">₪${params.amount}</td></tr>
      </table>
      <a href="${params.projectUrl}" style="${btnStyle}">View Project</a>
    `),
  }
}
