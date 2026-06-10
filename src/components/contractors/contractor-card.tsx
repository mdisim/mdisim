import Link from 'next/link'
import { Contractor } from '@/lib/types'
import { Mail, Phone, MapPin, Briefcase, Hash } from 'lucide-react'

interface ContractorCardProps {
  contractor: Contractor
  onEdit: (contractor: Contractor) => void
  onDelete: (id: string) => void
}

export function ContractorCard({ contractor, onEdit, onDelete }: ContractorCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{contractor.name}</h3>
          {contractor.company && (
            <p className="text-sm text-slate-500">{contractor.company}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Link
            href={`/contractors/${contractor.id}`}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors"
          >
            View
          </Link>
          <button
            onClick={() => onEdit(contractor)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(contractor.id)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {contractor.specialty && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Briefcase size={13} className="text-amber-500 shrink-0" />
            <span>{contractor.specialty}</span>
          </div>
        )}
        {contractor.email && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail size={13} className="text-amber-500 shrink-0" />
            <a href={`mailto:${contractor.email}`} className="hover:text-amber-600 truncate">
              {contractor.email}
            </a>
          </div>
        )}
        {contractor.phone && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone size={13} className="text-amber-500 shrink-0" />
            <a href={`tel:${contractor.phone}`} className="hover:text-amber-600">
              {contractor.phone}
            </a>
          </div>
        )}
        {contractor.address && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={13} className="text-amber-500 shrink-0" />
            <span className="truncate">{contractor.address}</span>
          </div>
        )}
        {contractor.license_number && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Hash size={13} className="text-slate-400 shrink-0" />
            <span className="font-mono text-xs">License: {contractor.license_number}</span>
          </div>
        )}
      </div>
    </div>
  )
}
