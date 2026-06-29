import type { Project, PaymentCert } from '@/lib/types'

export async function exportPaymentReportToExcel(project: Project, certificates: PaymentCert[]) {
  const XLSX = await import('xlsx')

  const currency = project.currency
  const rows: Record<string, unknown>[] = []

  let totalGross = 0
  let totalRetention = 0
  let totalVAT = 0
  let totalNet = 0

  for (const cert of certificates) {
    totalGross += cert.gross_amount
    totalRetention += cert.retention_amount
    totalVAT += cert.vat_amount
    totalNet += cert.net_payable
    rows.push({
      'Cert #': cert.cert_number,
      'Period From': cert.period_from,
      'Period To': cert.period_to,
      Status: cert.status,
      [`Gross Amount (${currency})`]: Math.round(cert.gross_amount * 100) / 100,
      [`Retention (${currency})`]: Math.round(cert.retention_amount * 100) / 100,
      [`VAT (${currency})`]: Math.round(cert.vat_amount * 100) / 100,
      [`Net Payable (${currency})`]: Math.round(cert.net_payable * 100) / 100,
    })
  }

  rows.push({})
  rows.push({
    'Cert #': '',
    'Period From': '',
    'Period To': '',
    Status: 'TOTAL',
    [`Gross Amount (${currency})`]: Math.round(totalGross * 100) / 100,
    [`Retention (${currency})`]: Math.round(totalRetention * 100) / 100,
    [`VAT (${currency})`]: Math.round(totalVAT * 100) / 100,
    [`Net Payable (${currency})`]: Math.round(totalNet * 100) / 100,
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  ws['!cols'] = [
    { wch: 8 },   // Cert #
    { wch: 12 },  // Period From
    { wch: 12 },  // Period To
    { wch: 12 },  // Status
    { wch: 18 },  // Gross Amount
    { wch: 16 },  // Retention
    { wch: 14 },  // VAT
    { wch: 18 },  // Net Payable
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Payment Certificates')

  const filename = `Payment_Report_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, filename)
}
