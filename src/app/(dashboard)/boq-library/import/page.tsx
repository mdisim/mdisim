import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ImportLibraryClient from '../import-client'

export default function ImportLibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/boq-library" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> BOQ Library
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Import Library Items</h1>
        <p className="text-slate-500 text-sm mt-1">Import items from an Excel or CSV file into your BOQ Library</p>
      </div>
      <ImportLibraryClient />
    </div>
  )
}
