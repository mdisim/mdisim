import Link from 'next/link'
import { Contractor } from '@/lib/types'
import { Mail, Phone, MapPin, Briefcase, Hash, User } from 'lucide-react'

interface ContractorCardProps {
  contractor: Contractor
  onEdit: (contractor: Contractor) => void
  onDelete: (id: string) => void
}

export function ContractorCard({ contractor, onEdit, onDelete }: ContractorCardProps) {
  const initials = contractor.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-200">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
            {initials || <User size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-900 truncate">{contractor.name}</h3>
            {contractor.company && (
              <p className="text-sm text-slate-500 truncate">{contractor.company}</p>
            )}
            {contractor.specialty && (
              <span className="inline-block mt-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                {contractor.specialty}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="px-5 pb-4 space-y-2">
        {contractor.email && (
          <div className="flex items-center gap-2.5 text-sm text-slate-600">
            <Mail size={14} className="text-blue-500 shrink-0" />
            <a href={`mailto:${contractor.email}`} className="hover:text-blue-600 truncate transition-colors">
              {contractor.email}
            </a>
          </div>
        )}
        {contractor.phone && (
          <div className="flex items-center gap-2.5 text-sm text-slate-600">
            <Phone size={14} className="text-blue-500 shrink-0" />
            <a href={`tel:${contractor.phone}`} className="hover:text-blue-600 transition-colors">
              {contractor.phone}
            </a>
          </div>
        )}
        {contractor.address && (
          <div className="flex items-center gap-2.5 text-sm text-slate-600">
            <MapPin size={14} className="text-blue-500 shrink-0" />
            <span className="truncate">{contractor.address}</span>
          </div>
        )}
        {contractor.license_number && (
          <div className="flex items-center gap-2.5 text-sm text-slate-500">
            <Hash size={14} className="text-slate-400 shrink-0" />
            <span className="font-mono text-xs">License: {contractor.license_number}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center border-t border-slate-100 divide-x divide-slate-100">
        <Link
          href={`/contractors/${contractor.id}`}
          className="flex-1 text-center px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors rounded-bl-xl"
        >
          View
        </Link>
        <button
          onClick={() => onEdit(contractor)}
          className="flex-1 text-center px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(contractor.id)}
          className="flex-1 text-center px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors rounded-br-xl"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
