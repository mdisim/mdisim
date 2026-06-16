'use client'

import { useState } from 'react'

interface Props {
  projectId: string
  projectName: string
  bac: number
  ac: number
  startDate: string | null
  endDate: string | null
}

function fmt(n: number): string {
  return `₪${Math.round(n).toLocaleString('en', { maximumFractionDigits: 0 })}`
}

function gaugePath(value: number, min: number, max: number, cx: number, cy: number, r: number): string {
  const f = Math.max(0, Math.min(1, (value - min) / (max - min)))
  if (f <= 0) return ''
  const endAngle = (1 - f) * Math.PI
  const ex = (cx + r * Math.cos(endAngle)).toFixed(1)
  const ey = (cy - r * Math.sin(endAngle)).toFixed(1)
  const largeArc = f > 0.5 ? 1 : 0
  return `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`
}

function Gauge({ value, label, min = 0.5, max = 1.5 }: { value: number; label: string; min?: number; max?: number }) {
  const cx = 110
  const cy = 115
  const r = 88
  const color = value >= 1.0 ? '#22c55e' : value >= 0.8 ? '#f59e0b' : '#ef4444'
  const fillPath = gaugePath(value, min, max, cx, cy, r)

  return (
    <svg viewBox="0 0 220 145" className="w-full max-w-[220px]">
      {/* Background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#1e293b"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* Fill arc */}
      {fillPath && (
        <path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
        />
      )}
      {/* Center value */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill={color} fontSize="28" fontWeight="bold" fontFamily="monospace">
        {value.toFixed(2)}
      </text>
      {/* Label */}
      <text x={cx} y={cy + 18} textAnchor="middle" fill="#94a3b8" fontSize="13">
        {label}
      </text>
    </svg>
  )
}

export function EVMClient({ projectName, bac, ac, startDate, endDate }: Props) {
  const [percentComplete, setPercentComplete] = useState(0)

  // Compute time elapsed %
  const today = new Date()
  let timeElapsedPct = 0
  if (startDate && endDate) {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const now = today.getTime()
    const total = end - start
    if (total > 0) {
      timeElapsedPct = Math.max(0, Math.min(100, ((now - start) / total) * 100))
    }
  }

  const ev = bac * percentComplete / 100
  const pv = bac * timeElapsedPct / 100
  const cv = ev - ac
  const sv = ev - pv
  const cpi = ac > 0 ? ev / ac : 1
  const spi = pv > 0 ? ev / pv : 1
  const eac = cpi > 0 ? bac / cpi : bac
  const etc = eac - ac
  const vac = bac - eac
  const tcpi = (bac - ac) > 0 ? (bac - ev) / (bac - ac) : 0

  // Status banner
  const bannerColor =
    cpi < 0.8 && spi < 0.8
      ? 'bg-red-900/40 border-red-700 text-red-300'
      : cpi >= 1 && spi >= 1
      ? 'bg-green-900/40 border-green-700 text-green-300'
      : 'bg-amber-900/40 border-amber-700 text-amber-300'
  const bannerText =
    cpi < 0.8 && spi < 0.8
      ? 'Warning: Over budget and behind schedule'
      : cpi >= 1 && spi >= 1
      ? 'On track: Within budget and ahead of schedule'
      : 'Caution: Monitor cost and schedule performance'

  // S-Curve bars (scaled to max value)
  const barMax = Math.max(bac, ac, ev, pv, 1)
  const bars: { label: string; value: number; color: string }[] = [
    { label: 'BAC', value: bac, color: '#64748b' },
    { label: 'PV', value: pv, color: '#3b82f6' },
    { label: 'EV', value: ev, color: '#22c55e' },
    { label: 'AC', value: ac, color: '#f59e0b' },
  ]
  const chartH = 120
  const barW = 40
  const barGap = 20
  const chartW = bars.length * (barW + barGap) + barGap

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">EVM Dashboard — {projectName}</h1>
        <p className="text-slate-400 text-sm mt-1">Earned Value Management · BS/ISO EVM Standard</p>
      </div>

      {/* Status Banner */}
      <div className={`border rounded-xl px-5 py-3 text-sm font-medium ${bannerColor}`}>
        {bannerText}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Budget at Completion', value: bac, sub: 'BAC' },
          { label: 'Actual Cost', value: ac, sub: 'AC' },
          { label: 'Earned Value', value: ev, sub: 'EV' },
          { label: 'Planned Value', value: pv, sub: 'PV' },
        ].map(({ label, value, sub }) => (
          <div key={sub} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-white mt-1">{fmt(value)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Percent Complete */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          % Complete (manual input)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={percentComplete}
            onChange={e => setPercentComplete(Number(e.target.value))}
            className="flex-1 accent-amber-500"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={percentComplete}
            onChange={e => setPercentComplete(Math.max(0, Math.min(100, Number(e.target.value))))}
            className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm text-center"
          />
          <span className="text-slate-400 text-sm">%</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Time elapsed: {timeElapsedPct.toFixed(1)}% of project duration
        </p>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex flex-col items-center">
          <p className="text-sm font-semibold text-slate-300 mb-2">Cost Performance Index</p>
          <Gauge value={cpi} label="CPI" />
          <p className="text-xs text-slate-500 mt-1">{cpi >= 1 ? 'Under budget' : 'Over budget'}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex flex-col items-center">
          <p className="text-sm font-semibold text-slate-300 mb-2">Schedule Performance Index</p>
          <Gauge value={spi} label="SPI" />
          <p className="text-xs text-slate-500 mt-1">{spi >= 1 ? 'Ahead of schedule' : 'Behind schedule'}</p>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-200">Performance Metrics</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Metric</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Value</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Interpretation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {[
              { metric: 'CV', value: fmt(cv), interp: cv >= 0 ? 'Under budget' : 'Over budget', ok: cv >= 0 },
              { metric: 'SV', value: fmt(sv), interp: sv >= 0 ? 'Ahead of schedule' : 'Behind schedule', ok: sv >= 0 },
              { metric: 'EAC', value: fmt(eac), interp: 'Forecast cost at completion', ok: true },
              { metric: 'ETC', value: fmt(etc), interp: 'Cost to complete', ok: true },
              { metric: 'VAC', value: fmt(vac), interp: 'Variance at completion', ok: vac >= 0 },
              { metric: 'TCPI', value: tcpi.toFixed(2), interp: 'Performance needed to finish on budget', ok: tcpi <= 1 },
            ].map(({ metric, value, interp, ok }) => (
              <tr key={metric}>
                <td className="px-5 py-3 font-mono font-semibold text-slate-300">{metric}</td>
                <td className={`px-5 py-3 text-right font-semibold ${ok ? 'text-green-400' : 'text-red-400'}`}>{value}</td>
                <td className="px-5 py-3 text-slate-400 text-xs">{interp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* S-Curve / Bar Chart */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">S-Curve Visualization</h2>
        <svg viewBox={`0 0 ${chartW} ${chartH + 30}`} className="w-full max-w-sm mx-auto">
          {bars.map(({ label, value, color }, i) => {
            const barH = barMax > 0 ? (value / barMax) * chartH : 0
            const x = barGap + i * (barW + barGap)
            const y = chartH - barH
            return (
              <g key={label}>
                <rect x={x} y={y} width={barW} height={barH} fill={color} rx="3" opacity="0.85" />
                <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fill="#94a3b8" fontSize="11">{label}</text>
                <text x={x + barW / 2} y={Math.max(y - 4, 10)} textAnchor="middle" fill={color} fontSize="9">
                  {barMax > 0 ? `${((value / barMax) * 100).toFixed(0)}%` : '0%'}
                </text>
              </g>
            )
          })}
        </svg>
        <div className="flex justify-center gap-4 mt-2 flex-wrap">
          {bars.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
