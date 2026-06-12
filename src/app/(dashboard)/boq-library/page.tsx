import { getLibraryItems } from '@/app/actions/boq-library'
import { BOQLibraryClient } from './boq-library-client'
import Link from 'next/link'
import { Upload } from 'lucide-react'

export default async function BOQLibraryPage() {
  const { data: items } = await getLibraryItems()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">BOQ Library</h1>
          <p className="text-slate-500 text-sm mt-1">Reusable item templates for your Bills of Quantities</p>
        </div>
        <Link
          href="/boq-library/import"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Upload size={15} />
          Import Library
        </Link>
      </div>
      <BOQLibraryClient items={items} />
    </div>
  )
}
