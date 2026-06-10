import { getLibraryItems } from '@/app/actions/boq-library'
import { BOQLibraryClient } from './boq-library-client'

export default async function BOQLibraryPage() {
  const { data: items } = await getLibraryItems()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">BOQ Library</h1>
          <p className="text-slate-500 text-sm mt-1">Reusable item templates for your Bills of Quantities</p>
        </div>
      </div>
      <BOQLibraryClient items={items} />
    </div>
  )
}
