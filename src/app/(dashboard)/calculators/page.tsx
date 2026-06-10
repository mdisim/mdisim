import { CalculatorsClient } from './calculators-client'

export default function CalculatorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Engineering Calculators</h1>
        <p className="text-slate-500 text-sm mt-1">Quick calculators for common construction engineering tasks</p>
      </div>
      <CalculatorsClient />
    </div>
  )
}
