'use client'

interface ProjectEVM {
  id: string
  name: string
  budget: number
  actualCost: number
  plannedValue: number
  earnedValue: number
  cpi: number
  spi: number
  cv: number
  sv: number
  eac: number
  status: string
}

interface EVMDashboardProps {
  projects: ProjectEVM[]
}

function fmt(value: number): string {
  return `₪${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function fmtDelta(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}₪${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function indicatorColor(value: number): string {
  if (value >= 1.0) return 'text-green-700 bg-green-100'
  if (value >= 0.9) return 'text-amber-700 bg-amber-100'
  return 'text-red-700 bg-red-100'
}

function indicatorDot(value: number): string {
  if (value >= 1.0) return 'bg-green-500'
  if (value >= 0.9) return 'bg-amber-500'
  return 'bg-red-500'
}

function cvColor(value: number): string {
  if (value >= 0) return 'text-green-700'
  return 'text-red-600'
}

export function EVMDashboard({ projects }: EVMDashboardProps) {
  if (projects.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Earned Value Management</h2>
        <p className="text-sm text-slate-400 text-center py-8">No projects with budget data available</p>
      </div>
    )
  }

  const avgCPI = projects.reduce((s, p) => s + p.cpi, 0) / projects.length
  const avgSPI = projects.reduce((s, p) => s + p.spi, 0) / projects.length
  const totalCV = projects.reduce((s, p) => s + p.cv, 0)
  const atRisk = projects.filter(p => p.cpi < 0.9).length

  const maxBarValue = Math.max(
    ...projects.flatMap(p => [p.plannedValue, p.earnedValue, p.actualCost]),
    1
  )

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Avg CPI</p>
          <p className={`text-2xl font-bold mt-1 ${avgCPI >= 1.0 ? 'text-green-600' : avgCPI >= 0.9 ? 'text-amber-600' : 'text-red-600'}`}>
            {avgCPI.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Cost Performance Index</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Avg SPI</p>
          <p className={`text-2xl font-bold mt-1 ${avgSPI >= 1.0 ? 'text-green-600' : avgSPI >= 0.9 ? 'text-amber-600' : 'text-red-600'}`}>
            {avgSPI.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Schedule Performance Index</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total CV</p>
          <p className={`text-2xl font-bold mt-1 ${totalCV >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtDelta(totalCV)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Cost Variance</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Projects at Risk</p>
          <p className={`text-2xl font-bold mt-1 ${atRisk === 0 ? 'text-green-600' : 'text-red-600'}`}>
            {atRisk}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">CPI below 0.9</p>
        </div>
      </div>

      {/* EVM Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">EVM Performance Table</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 pr-3 text-slate-500 font-medium">Project</th>
                <th className="text-right py-2 px-2 text-slate-500 font-medium">Budget (BAC)</th>
                <th className="text-right py-2 px-2 text-slate-500 font-medium">PV</th>
                <th className="text-right py-2 px-2 text-slate-500 font-medium">EV</th>
                <th className="text-right py-2 px-2 text-slate-500 font-medium">AC</th>
                <th className="text-center py-2 px-2 text-slate-500 font-medium">CPI</th>
                <th className="text-center py-2 px-2 text-slate-500 font-medium">SPI</th>
                <th className="text-right py-2 px-2 text-slate-500 font-medium">CV</th>
                <th className="text-right py-2 px-2 text-slate-500 font-medium">SV</th>
                <th className="text-right py-2 pl-2 text-slate-500 font-medium">EAC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {projects.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${indicatorDot(p.cpi)}`} />
                      <span className="font-medium text-slate-800 truncate max-w-[140px]">{p.name}</span>
                    </div>
                    <span className={`mt-0.5 inline-block px-1 py-0.5 rounded text-xs capitalize ${p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-600">{fmt(p.budget)}</td>
                  <td className="py-2.5 px-2 text-right text-slate-600">{fmt(p.plannedValue)}</td>
                  <td className="py-2.5 px-2 text-right text-slate-600">{fmt(p.earnedValue)}</td>
                  <td className="py-2.5 px-2 text-right text-slate-600">{fmt(p.actualCost)}</td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded font-semibold ${indicatorColor(p.cpi)}`}>
                      {p.cpi.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded font-semibold ${indicatorColor(p.spi)}`}>
                      {p.spi.toFixed(2)}
                    </span>
                  </td>
                  <td className={`py-2.5 px-2 text-right font-medium ${cvColor(p.cv)}`}>{fmtDelta(p.cv)}</td>
                  <td className={`py-2.5 px-2 text-right font-medium ${cvColor(p.sv)}`}>{fmtDelta(p.sv)}</td>
                  <td className="py-2.5 pl-2 text-right text-slate-600">{fmt(p.eac)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mini Bar Chart: PV vs EV vs AC */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">PV / EV / AC Comparison</h2>
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-slate-400 inline-block" /> Planned Value</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-blue-500 inline-block" /> Earned Value</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-amber-500 inline-block" /> Actual Cost</span>
        </div>
        <div className="space-y-5">
          {projects.map(p => {
            const pvPct = (p.plannedValue / maxBarValue) * 100
            const evPct = (p.earnedValue / maxBarValue) * 100
            const acPct = (p.actualCost / maxBarValue) * 100
            return (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]">{p.name}</span>
                  <span className="text-xs text-slate-400 shrink-0 ml-2">BAC: {fmt(p.budget)}</span>
                </div>
                <div className="space-y-1">
                  {/* PV */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-5">PV</span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-slate-400 rounded-sm flex items-center pl-1 transition-all"
                        style={{ width: `${Math.max(pvPct, 0.5)}%` }}
                      >
                        {pvPct > 15 && <span className="text-xs text-white font-medium truncate">{fmt(p.plannedValue)}</span>}
                      </div>
                    </div>
                    {pvPct <= 15 && <span className="text-xs text-slate-500 w-24 shrink-0">{fmt(p.plannedValue)}</span>}
                  </div>
                  {/* EV */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-5">EV</span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-sm flex items-center pl-1 transition-all"
                        style={{ width: `${Math.max(evPct, 0.5)}%` }}
                      >
                        {evPct > 15 && <span className="text-xs text-white font-medium truncate">{fmt(p.earnedValue)}</span>}
                      </div>
                    </div>
                    {evPct <= 15 && <span className="text-xs text-slate-500 w-24 shrink-0">{fmt(p.earnedValue)}</span>}
                  </div>
                  {/* AC */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-5">AC</span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-sm flex items-center pl-1 transition-all"
                        style={{ width: `${Math.max(acPct, 0.5)}%` }}
                      >
                        {acPct > 15 && <span className="text-xs text-white font-medium truncate">{fmt(p.actualCost)}</span>}
                      </div>
                    </div>
                    {acPct <= 15 && <span className="text-xs text-slate-500 w-24 shrink-0">{fmt(p.actualCost)}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
