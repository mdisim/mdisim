'use client'

import { PaymentCertificate, Project, Company } from '@/lib/types'
import Link from 'next/link'

interface PrintCertificateClientProps {
  project: Project
  certificate: PaymentCertificate
  company: Company | null
}

export function PrintCertificateClient({ project, certificate, company }: PrintCertificateClientProps) {
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const items = [
    { description: 'Work Completed This Period', amount: certificate.total_certified, retention: certificate.retention_amount, net: certificate.total_certified - certificate.retention_amount },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Toolbar — hidden on print */}
      <div className="no-print flex items-center gap-4 p-4 bg-slate-50 border-b border-slate-200">
        <Link href={`/projects/${project.id}/certificates`} className="text-sm text-slate-600 hover:text-slate-800">
          ← Back to Certificates
        </Link>
        <button
          onClick={() => window.print()}
          className="ml-auto px-6 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Print Certificate
        </button>
      </div>

      {/* Certificate — full width */}
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-800">
          <div>
            {company?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo_url} alt="Company logo" className="h-14 object-contain mb-2" />
            )}
            <h1 className="text-2xl font-bold text-slate-900">{company?.name ?? 'Company'}</h1>
            {company?.address && <p className="text-sm text-slate-500 mt-1">{company.address}</p>}
            {company?.phone && <p className="text-sm text-slate-500">{company.phone}</p>}
            {company?.registration_number && <p className="text-xs text-slate-400">Reg: {company.registration_number}</p>}
            {company?.vat_number && <p className="text-xs text-slate-400">VAT: {company.vat_number}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Payment Certificate</h2>
            <p className="text-sm text-slate-500 mt-1">Certificate No: <span className="font-semibold text-slate-800">{certificate.certificate_number}</span></p>
            <p className="text-sm text-slate-500">Status: <span className="font-semibold text-slate-800 uppercase">{certificate.status}</span></p>
          </div>
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Project</p>
              <p className="font-semibold text-slate-800">{project.name}</p>
            </div>
            {project.client_name && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Client</p>
                <p className="text-slate-700">{project.client_name}</p>
              </div>
            )}
            {project.location && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Location</p>
                <p className="text-slate-700">{project.location}</p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Period</p>
              <p className="text-slate-700">
                {new Date(certificate.period_start).toLocaleDateString()} — {new Date(certificate.period_end).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Issue Date</p>
              <p className="text-slate-700">{new Date(certificate.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Itemized Breakdown */}
        <table className="w-full text-sm mb-8 border border-slate-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="text-left px-4 py-3 font-semibold">Description</th>
              <th className="text-right px-4 py-3 font-semibold">Amount Certified</th>
              <th className="text-right px-4 py-3 font-semibold">Retention ({certificate.retention_percent}%)</th>
              <th className="text-right px-4 py-3 font-semibold">Net Payment</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-800">{item.description}</td>
                <td className="px-4 py-3 text-right text-slate-700">{fmt(item.amount)}</td>
                <td className="px-4 py-3 text-right text-slate-700">({fmt(item.retention)})</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(item.net)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-300">
              <td className="px-4 py-3 font-bold text-slate-800">TOTALS</td>
              <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(certificate.total_certified)}</td>
              <td className="px-4 py-3 text-right font-bold text-slate-800">({fmt(certificate.retention_amount)})</td>
              <td className="px-4 py-3 text-right font-bold text-xl text-slate-900">{fmt(certificate.net_payment)}</td>
            </tr>
          </tfoot>
        </table>

        {certificate.notes && (
          <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-slate-700">{certificate.notes}</p>
          </div>
        )}

        {/* Signature Blocks */}
        <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-slate-200">
          {[
            { title: 'Prepared By', subtitle: 'Quantity Surveyor' },
            { title: 'Certified By', subtitle: 'Project Manager' },
            { title: 'Approved By', subtitle: 'Client Representative' },
          ].map(sig => (
            <div key={sig.title} className="text-center">
              <div className="h-16 border-b-2 border-slate-400 mb-2"></div>
              <p className="font-semibold text-slate-800 text-sm">{sig.title}</p>
              <p className="text-xs text-slate-400">{sig.subtitle}</p>
              <p className="text-xs text-slate-400 mt-1">Date: _______________</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
          <p>{company?.name}{company?.address ? ` | ${company.address}` : ''}{company?.phone ? ` | ${company.phone}` : ''}{company?.email ? ` | ${company.email}` : ''}</p>
          <p className="mt-1">This is a computer-generated document. Certificate No. {certificate.certificate_number}</p>
        </div>
      </div>
    </div>
  )
}
