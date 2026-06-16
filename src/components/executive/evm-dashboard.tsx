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

/** CPI/SPI semi-circle gauge using SVG */
function GaugeChart({ value, label }: { value: number; label: string }) {
  // Semicircle from left (-pi) to right (0), displayed as top arc
  // Map value 0–2 to angle 0°–180°
  const clampedValue = Math.min(Math.max(value, 0), 2)
  const angleDeg = (clampedValue / 2) * 180
  const angleRad = ((angleDeg - 180) * Math.PI) / 180

  const cx = 60
  const cy = 60
  const r = 48
  const needleX = cx + r * Math.cos(angleRad)
  const needleY = cy + r * Math.sin(angleRad)

  // Zone colors on arc — we draw 3 arcs
  // Red: 0–0.45 of semicircle (0–0.9 value), Amber: 0.45–0.55, Green: 0.55–1.0
  function arcPath(startAngleDeg: number, endAngleDeg: number): string {
    const start = ((startAngleDeg - 180) * Math.PI) / 180
    const end = ((endAngleDeg - 180) * Math.PI) / 180
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
  }

  const color = value >= 1.0 ? '#16a34a' : value >= 0.9 ? '#d97706' : '#dc2626'

  return (
    <div className="flex flex-col items-center">
      <svg width={120} height={70} viewBox="0 0 120 70">
        {/* Background arc zones */}
        <path d={arcPath(0, 81)} stroke="#fecaca" strokeWidth={10} fill="none" strokeLinecap="round" />
        <path d={arcPath(81, 99)} stroke="#fde68a" strokeWidth={10} fill="none" />
        <path d={arcPath(99, 180)} stroke="#bbf7d0" strokeWidth={10} fill="none" strokeLinecap="round" />
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={4} fill={color} />
        {/* Value label */}
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fontWeight="700" fill={color}>
          {value.toFixed(2)}
        </text>
      </svg>
      <span className="text-xs text-slate-500 mt-0.5">{label}</span>
    </div>
  )
}

/** Sparkline SVG of CPI values across projects */
function CpiSparkline({ projects }: { projects: ProjectEVM[] }) {
  if (projects.length < 2) return null

  const W = 320
  const H = 60
  const pad = 10

  const values = projects.map(p => p.cpi)
  const minV = Math.min(...values, 0.5)
  const maxV = Math.max(...values, 1.5)

  const xStep = (W - pad * 2) / (values.length - 1)

  const pts = values.map((v, i) => {
    const x = pad + i * xStep
    const y = H - pad - ((v - minV) / (maxV - minV)) * (H - pad * 2)
    return { x, y, v }
  })

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">CPI trend across projects</p>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        {/* Reference line at CPI=1.0 */}
        {(() => {
          const refY = H - pad - ((1.0 - minV) / (maxV - minV)) * (H - pad * 2)
          return <line x1={pad} y1={refY} x2={W - pad} y2={refY} stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 3" />
        })()}
        <polyline points={polyline} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={p.v >= 1.0 ? '#16a34a' : p.v >= 0.9 ? '#d97706' : '#dc2626'} />
            <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize={9} fill="#6b7280">
              {p.v.toFixed(2)}
            </text>
          </g>
        ))}
        {/* Project name labels */}
        {pts.map((p, i) => (
          <text key={`lbl-${i}`} x={p.x} y={H} textAnchor="middle" fontSize={8} fill="#9ca3af">
            {projects[i].name.slice(0, 8)}
          </text>
        ))}
      </svg>
    </div>
  )
}

/** Grouped horizontal SVG bars: PV/EV/AC per project */
function PvEvAcBars({ projects, maxVal }: { projects: ProjectEVM[]; maxVal: number }) {
  const BAR_W = 300
  const ROW_H = 14
  const LABEL_W = 24
  const AMT_W = 80
  const TOTAL_W = LABEL_W + BAR_W + AMT_W

  return (
    <div className="space-y-5">
      {projects.map(p => {
        const pvW = maxVal > 0 ? (p.plannedValue / maxVal) * BAR_W : 0
        const evW = maxVal > 0 ? (p.earnedValue / maxVal) * BAR_W : 0
        const acW = maxVal > 0 ? (p.actualCost / maxVal) * BAR_W : 0

        return (
          <div key={p.id}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]">{p.name}</span>
              <span className="text-xs text-slate-400 shrink-0 ml-2">BAC: {fmt(p.budget)}</span>
            </div>
            <svg width={TOTAL_W} height={ROW_H * 3 + 4} viewBox={`0 0 ${TOTAL_W} ${ROW_H * 3 + 4}`} className="overflow-visible">
              {/* PV */}
              <text x={0} y={ROW_H - 3} fontSize={9} fill="#9ca3af" fontWeight="500">PV</text>
              <rect x={LABEL_W} y={0} width={BAR_W} height={ROW_H - 2} rx={3} fill="#f1f5f9" />
              <rect x={LABEL_W} y={0} width={Math.max(pvW, 2)} height={ROW_H - 2} rx={3} fill="#94a3b8" />
              <text x={LABEL_W + BAR_W + 6} y={ROW_H - 3} fontSize={9} fill="#64748b">{fmt(p.plannedValue)}</text>

              {/* EV */}
              <text x={0} y={ROW_H * 2 - 1} fontSize={9} fill="#9ca3af" fontWeight="500">EV</text>
              <rect x={LABEL_W} y={ROW_H + 2} width={BAR_W} height={ROW_H - 2} rx={3} fill="#f1f5f9" />
              <rect x={LABEL_W} y={ROW_H + 2} width={Math.max(evW, 2)} height={ROW_H - 2} rx={3} fill="#3b82f6" />
              <text x={LABEL_W + BAR_W + 6} y={ROW_H * 2 - 1} fontSize={9} fill="#64748b">{fmt(p.earnedValue)}</text>

              {/* AC */}
              <text x={0} y={ROW_H * 3 + 1} fontSize={9} fill="#9ca3af" fontWeight="500">AC</text>
              <rect x={LABEL_W} y={ROW_H * 2 + 4} width={BAR_W} height={ROW_H - 2} rx={3} fill="#f1f5f9" />
              <rect x={LABEL_W} y={ROW_H * 2 + 4} width={Math.max(acW, 2)} height={ROW_H - 2} rx={3} fill="#f59e0b" />
              <text x={LABEL_W + BAR_W + 6} y={ROW_H * 3 + 1} fontSize={9} fill="#64748b">{fmt(p.actualCost)}</text>
            </svg>
          </div>
        )
      })}
    </div>
  )
}

/** Summary cards: BAC, EAC, ETC, CV, SV */
function SummaryCards({ projects }: { projects: ProjectEVM[] }) {
  const bac = projects.reduce((s, p) => s + p.budget, 0)
  const eac = projects.reduce((s, p) => s + p.eac, 0)
  const ac = projects.reduce((s, p) => s + p.actualCost, 0)
  const ev = projects.reduce((s, p) => s + p.earnedValue, 0)
  const pv = projects.reduce((s, p) => s + p.plannedValue, 0)
  const etc = eac - ac
  const cv = ev - ac
  const sv = ev - pv

  const cards = [
    { label: 'BAC', sublabel: 'Budget at Completion', value: fmt(bac), color: 'text-slate-900' },
    { label: 'EAC', sublabel: 'Estimate at Completion', value: fmt(eac), color: eac > bac ? 'text-red-600' : 'text-green-600' },
    { label: 'ETC', sublabel: 'Estimate to Complete', value: fmt(etc), color: 'text-blue-600' },
    { label: 'CV', sublabel: 'Cost Variance', value: fmtDelta(cv), color: cv >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: 'SV', sublabel: 'Schedule Variance', value: fmtDelta(sv), color: sv >= 0 ? 'text-green-600' : 'text-red-600' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map(c => (
        <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">{c.label}</p>
          <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          <p className="text-xs text-slate-400 mt-0.5">{c.sublabel}</p>
        </div>
      ))}
    </div>
  )
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
      {/* BAC/EAC/ETC/CV/SV Summary */}
      <SummaryCards projects={projects} />

      {/* Legacy summary cards: Avg CPI, SPI, CV, At Risk */}
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

      {/* CPI/SPI Gauges per project */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">CPI / SPI per Project</h2>
        <div className="overflow-x-auto">
          <div className="flex gap-6 flex-wrap">
            {projects.map(p => (
              <div key={p.id} className="flex flex-col items-center gap-1 min-w-[130px]">
                <span className="text-xs font-medium text-slate-600 truncate max-w-[130px] text-center">{p.name}</span>
                <div className="flex gap-2">
                  <GaugeChart value={p.cpi} label="CPI" />
                  <GaugeChart value={p.spi} label="SPI" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-red-300 inline-block" /> {'< 0.9 at risk'}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-amber-300 inline-block" /> 0.9–1.0 watch</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-green-300 inline-block" /> {'≥ 1.0 healthy'}</span>
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

      {/* SVG Bar Chart: PV/EV/AC */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">PV / EV / AC Comparison</h2>
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-slate-400 inline-block" /> Planned Value</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-blue-500 inline-block" /> Earned Value</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-amber-500 inline-block" /> Actual Cost</span>
        </div>
        <div className="overflow-x-auto">
          <PvEvAcBars projects={projects} maxVal={maxBarValue} />
        </div>
      </div>

      {/* CPI Sparkline Trend */}
      {projects.length >= 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">CPI Performance Trend</h2>
          <div className="overflow-x-auto">
            <CpiSparkline projects={projects} />
          </div>
        </div>
      )}
    </div>
  )
}
