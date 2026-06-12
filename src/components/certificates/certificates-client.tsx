'use client'

import { useState } from 'react'
import { PaymentCertificate } from '@/lib/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Award, Trash2, Pencil, FileText } from 'lucide-react'
import { createCertificate, updateCertificate, deleteCertificate } from '@/app/actions/certificates'
import { CertificateDetailModal } from './certificate-detail-modal'
import { useRouter } from 'next/navigation'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  certified: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
}

interface CertificatesClientProps {
  certificates: PaymentCertificate[]
  projectId: string
}

function CertificateForm({
  projectId,
  certificate,
  onSuccess,
  onCancel,
}: {
  projectId: string
  certificate?: PaymentCertificate
  onSuccess: () => void
  onCancel: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = certificate
      ? await updateCertificate(certificate.id, projectId, formData)
      : await createCertificate(projectId, formData)
    if ('error' in result) {
      setError(result.error ?? 'An error occurred')
    } else {
      router.refresh()
      onSuccess()
    }
    setSaving(false)
  }

  const inputClass =
    'w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
  const labelClass = 'block text-xs text-slate-500 uppercase tracking-wide mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Certificate Number *</label>
          <input
            name="certificate_number"
            required
            defaultValue={certificate?.certificate_number ?? ''}
            placeholder="PC-001"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select name="status" defaultValue={certificate?.status ?? 'draft'} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="certified">Certified</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Period Start *</label>
          <input
            name="period_start"
            type="date"
            required
            defaultValue={certificate?.period_start ?? ''}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Period End *</label>
          <input
            name="period_end"
            type="date"
            required
            defaultValue={certificate?.period_end ?? ''}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Total Certified ($)</label>
          <input
            name="total_certified"
            type="number"
            step="0.01"
            min="0"
            defaultValue={certificate?.total_certified ?? 0}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Retention (%)</label>
          <input
            name="retention_percent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={certificate?.retention_percent ?? 0}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          name="notes"
          defaultValue={certificate?.notes ?? ''}
          rows={3}
          className={inputClass}
          placeholder="Optional notes..."
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : certificate ? 'Save Changes' : 'Create Certificate'}
        </Button>
      </div>
    </form>
  )
}

export function CertificatesClient({ certificates, projectId }: CertificatesClientProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [editCert, setEditCert] = useState<PaymentCertificate | null>(null)
  const [detailCert, setDetailCert] = useState<PaymentCertificate | null>(null)
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this certificate?')) return
    await deleteCertificate(id, projectId)
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          New Certificate
        </Button>
      </div>

      {certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Award size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">No certificates yet</p>
          <p className="text-sm mt-1">Create payment certificates to track certified amounts</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-400 transition-colors"
          >
            New Certificate
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Certificate #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Period</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Certified</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Retention</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Payment</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {certificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{cert.certificate_number}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(cert.period_start).toLocaleDateString()} – {new Date(cert.period_end).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">${cert.total_certified.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{cert.retention_percent}% (${cert.retention_amount.toLocaleString()})</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">${cert.net_payment.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[cert.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {cert.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setDetailCert(cert)}
                        title="View line items"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={() => setEditCert(cert)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cert.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="New Payment Certificate" size="lg">
        <CertificateForm
          projectId={projectId}
          onSuccess={() => setShowAdd(false)}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal isOpen={!!editCert} onClose={() => setEditCert(null)} title="Edit Certificate" size="lg">
        {editCert && (
          <CertificateForm
            projectId={projectId}
            certificate={editCert}
            onSuccess={() => setEditCert(null)}
            onCancel={() => setEditCert(null)}
          />
        )}
      </Modal>

      {detailCert && (
        <CertificateDetailModal
          certificate={detailCert}
          projectId={projectId}
          onClose={() => setDetailCert(null)}
        />
      )}
    </>
  )
}
