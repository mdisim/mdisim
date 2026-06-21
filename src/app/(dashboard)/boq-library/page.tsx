import { getLibraryItems } from '@/app/actions/boq-library'
import { BOQLibraryClient } from './boq-library-client'
import Link from 'next/link'
import { Upload } from 'lucide-react'

export default async function BOQLibraryPage() {
  const { data: items } = await getLibraryItems()

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">BOQ Library</h1>
          <p className="text-slate-500 text-sm mt-1">Reusable item templates for your Bills of Quantities</p>
        </div>
        <Link
          href="/boq-library/import"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
        >
          <Upload size={15} />
          Import Library
        </Link>
      </div>
      <BOQLibraryClient items={items} />
    </div>
  )
}
