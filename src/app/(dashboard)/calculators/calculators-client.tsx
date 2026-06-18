'use client'

import { useState } from 'react'

type Tab = 'concrete' | 'steel' | 'earthwork' | 'brick' | 'load' | 'plaster' | 'paint' | 'flooring'

// Concrete mix ratios per grade
const CONCRETE_MIX: Record<string, { cement: number; sand: number; aggregate: number; water: number }> = {
  C20: { cement: 320, sand: 0.44, aggregate: 0.88, water: 160 },
  C25: { cement: 360, sand: 0.40, aggregate: 0.80, water: 160 },
  C30: { cement: 400, sand: 0.36, aggregate: 0.72, water: 160 },
  C35: { cement: 440, sand: 0.33, aggregate: 0.66, water: 165 },
  C40: { cement: 480, sand: 0.30, aggregate: 0.60, water: 170 },
}

const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-slate-700 mb-1'
const resultBox = 'bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4'

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-amber-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-amber-700">{value}</span>
    </div>
  )
}

function ConcreteCalc() {
  const [grade, setGrade] = useState('C25')
  const [volume, setVolume] = useState('')
  const [result, setResult] = useState<{ cement: number; sand: number; aggregate: number; water: number } | null>(null)

  function calculate() {
    const v = parseFloat(volume)
    if (!v || v <= 0) return
    const mix = CONCRETE_MIX[grade]
    setResult({
      cement: mix.cement * v,
      sand: mix.sand * v,
      aggregate: mix.aggregate * v,
      water: mix.water * v,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Concrete Grade</label>
          <select value={grade} onChange={e => setGrade(e.target.value)} className={inputClass}>
            {Object.keys(CONCRETE_MIX).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Volume (m³)</label>
          <input type="number" min="0" step="0.1" value={volume} onChange={e => setVolume(e.target.value)} placeholder="e.g. 10" className={inputClass} />
        </div>
      </div>
      <button onClick={calculate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
        Calculate
      </button>
      {result && (
        <div className={resultBox}>
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Results for {volume} m³ of {grade}</p>
          <ResultRow label="Cement" value={`${result.cement.toLocaleString()} kg`} />
          <ResultRow label="Sand" value={`${result.sand.toFixed(2)} m³`} />
          <ResultRow label="Aggregate" value={`${result.aggregate.toFixed(2)} m³`} />
          <ResultRow label="Water" value={`${result.water.toLocaleString()} L`} />
        </div>
      )}
    </div>
  )
}

function SteelCalc() {
  const [diameter, setDiameter] = useState('12')
  const [length, setLength] = useState('')
  const [quantity, setQuantity] = useState('')
  const [result, setResult] = useState<{ totalLength: number; weightKg: number; weightTonnes: number } | null>(null)

  function calculate() {
    const d = parseFloat(diameter)
    const l = parseFloat(length)
    const q = parseFloat(quantity)
    if (!d || !l || !q) return
    const totalLength = l * q
    const weightKg = (d * d / 162) * totalLength
    setResult({ totalLength, weightKg, weightTonnes: weightKg / 1000 })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Bar Diameter (mm)</label>
          <select value={diameter} onChange={e => setDiameter(e.target.value)} className={inputClass}>
            {[6, 8, 10, 12, 16, 20, 25, 32].map(d => <option key={d} value={d}>T{d}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Length per Bar (m)</label>
          <input type="number" min="0" step="0.01" value={length} onChange={e => setLength(e.target.value)} placeholder="e.g. 6" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Number of Bars</label>
          <input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 100" className={inputClass} />
        </div>
      </div>
      <button onClick={calculate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
        Calculate
      </button>
      {result && (
        <div className={resultBox}>
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Results for T{diameter} bars</p>
          <ResultRow label="Total Length" value={`${result.totalLength.toLocaleString()} m`} />
          <ResultRow label="Weight" value={`${result.weightKg.toFixed(2)} kg`} />
          <ResultRow label="Weight" value={`${result.weightTonnes.toFixed(3)} tonnes`} />
        </div>
      )}
    </div>
  )
}

function EarthworkCalc() {
  const [L, setL] = useState('')
  const [A1, setA1] = useState('')
  const [A2, setA2] = useState('')
  const [Am, setAm] = useState('')
  const [result, setResult] = useState<number | null>(null)

  function calculate() {
    const l = parseFloat(L), a1 = parseFloat(A1), a2 = parseFloat(A2), am = parseFloat(Am)
    if (!l || isNaN(a1) || isNaN(a2) || isNaN(am)) return
    setResult((l / 6) * (a1 + 4 * am + a2))
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
        <strong>Prismatoid formula:</strong> V = (L/6)(A₁ + 4Aₘ + A₂)
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Length (m)</label>
          <input type="number" min="0" step="0.1" value={L} onChange={e => setL(e.target.value)} placeholder="e.g. 20" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>End Area 1 — A₁ (m²)</label>
          <input type="number" min="0" step="0.01" value={A1} onChange={e => setA1(e.target.value)} placeholder="e.g. 12" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Middle Area — Aₘ (m²)</label>
          <input type="number" min="0" step="0.01" value={Am} onChange={e => setAm(e.target.value)} placeholder="e.g. 15" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>End Area 2 — A₂ (m²)</label>
          <input type="number" min="0" step="0.01" value={A2} onChange={e => setA2(e.target.value)} placeholder="e.g. 14" className={inputClass} />
        </div>
      </div>
      <button onClick={calculate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
        Calculate
      </button>
      {result !== null && (
        <div className={resultBox}>
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Result</p>
          <ResultRow label="Volume" value={`${result.toFixed(3)} m³`} />
        </div>
      )}
    </div>
  )
}

function BrickCalc() {
  const [wallLength, setWallLength] = useState('')
  const [wallHeight, setWallHeight] = useState('')
  const [brickSize, setBrickSize] = useState('standard')
  const [result, setResult] = useState<{ bricks: number; mortar: number; cementBags: number } | null>(null)

  // Standard brick: 215×102.5×65mm, metric: 200×100×75mm
  const BRICK_DIMS: Record<string, { l: number; h: number; jointMm: number }> = {
    standard: { l: 0.225, h: 0.075, jointMm: 10 },
    metric: { l: 0.210, h: 0.085, jointMm: 10 },
  }

  function calculate() {
    const wl = parseFloat(wallLength)
    const wh = parseFloat(wallHeight)
    if (!wl || !wh) return
    const bd = BRICK_DIMS[brickSize]
    const bricksPerM2 = 1 / (bd.l * bd.h)
    const wallArea = wl * wh
    const bricks = Math.ceil(wallArea * bricksPerM2 * 1.05) // 5% waste
    const mortarVolume = wallArea * 0.03 // approx 30L/m²
    const cementBags = Math.ceil(mortarVolume * 250 / 50) // ~250 kg/m³, 50kg bags
    setResult({ bricks, mortar: mortarVolume, cementBags })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Wall Length (m)</label>
          <input type="number" min="0" step="0.1" value={wallLength} onChange={e => setWallLength(e.target.value)} placeholder="e.g. 10" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Wall Height (m)</label>
          <input type="number" min="0" step="0.1" value={wallHeight} onChange={e => setWallHeight(e.target.value)} placeholder="e.g. 3" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Brick Size</label>
          <select value={brickSize} onChange={e => setBrickSize(e.target.value)} className={inputClass}>
            <option value="standard">Standard (215×102.5×65mm)</option>
            <option value="metric">Metric (200×100×75mm)</option>
          </select>
        </div>
      </div>
      <button onClick={calculate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
        Calculate
      </button>
      {result && (
        <div className={resultBox}>
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Results (incl. 5% waste)</p>
          <ResultRow label="Number of Bricks" value={result.bricks.toLocaleString()} />
          <ResultRow label="Mortar Volume" value={`${result.mortar.toFixed(3)} m³`} />
          <ResultRow label="Cement Bags (50 kg)" value={`${result.cementBags} bags`} />
        </div>
      )}
    </div>
  )
}

function LoadCalc() {
  const [colLoad, setColLoad] = useState('')
  const [bearingCap, setBearingCap] = useState('')
  const [fos, setFos] = useState('3')
  const [result, setResult] = useState<{ area: number; side: number } | null>(null)

  function calculate() {
    const P = parseFloat(colLoad)
    const q = parseFloat(bearingCap)
    const f = parseFloat(fos)
    if (!P || !q || !f) return
    const area = (P * f) / q
    const side = Math.sqrt(area)
    setResult({ area, side })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Column Load (kN)</label>
          <input type="number" min="0" step="1" value={colLoad} onChange={e => setColLoad(e.target.value)} placeholder="e.g. 500" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Bearing Capacity (kPa)</label>
          <input type="number" min="0" step="1" value={bearingCap} onChange={e => setBearingCap(e.target.value)} placeholder="e.g. 150" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Factor of Safety</label>
          <input type="number" min="1" step="0.1" value={fos} onChange={e => setFos(e.target.value)} placeholder="e.g. 3" className={inputClass} />
        </div>
      </div>
      <button onClick={calculate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
        Calculate
      </button>
      {result && (
        <div className={resultBox}>
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Footing Requirements</p>
          <ResultRow label="Required Footing Area" value={`${result.area.toFixed(3)} m²`} />
          <ResultRow label="Square Footing Size" value={`${result.side.toFixed(2)} m × ${result.side.toFixed(2)} m`} />
        </div>
      )}
    </div>
  )
}

function PlasterCalc() {
  const [area, setArea] = useState('')
  const [thickness, setThickness] = useState('15')
  const [waste, setWaste] = useState('10')
  const [result, setResult] = useState<{ mortarM3: number; cementBags: number } | null>(null)

  function calculate() {
    const a = parseFloat(area)
    const t = parseFloat(thickness)
    const w = parseFloat(waste)
    if (!a || !t) return
    const wasteFactor = 1 + (w || 0) / 100
    const mortarM3 = a * (t / 1000) * wasteFactor
    // ~350 kg cement per m³ of mortar (1:3 mix), 50 kg bags
    const cementBags = Math.ceil((mortarM3 * 350) / 50)
    setResult({ mortarM3, cementBags })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Wall Area (m²)</label>
          <input type="number" min="0" step="0.1" value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. 50" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Thickness (mm)</label>
          <input type="number" min="0" step="1" value={thickness} onChange={e => setThickness(e.target.value)} placeholder="e.g. 15" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Waste (%)</label>
          <input type="number" min="0" step="1" value={waste} onChange={e => setWaste(e.target.value)} placeholder="e.g. 10" className={inputClass} />
        </div>
      </div>
      <button onClick={calculate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
        Calculate
      </button>
      {result && (
        <div className={resultBox}>
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Plaster Results</p>
          <ResultRow label="Mortar Volume" value={`${result.mortarM3.toFixed(3)} m³`} />
          <ResultRow label="Cement Bags (50 kg)" value={`${result.cementBags} bags`} />
        </div>
      )}
    </div>
  )
}

function PaintCalc() {
  const [area, setArea] = useState('')
  const [coats, setCoats] = useState('2')
  const [coverage, setCoverage] = useState('10')
  const [result, setResult] = useState<{ litres: number; cans5L: number; cans20L: number } | null>(null)

  function calculate() {
    const a = parseFloat(area)
    const c = parseFloat(coats)
    const cov = parseFloat(coverage)
    if (!a || !c || !cov) return
    const litres = (a * c) / cov
    const cans20L = Math.floor(litres / 20)
    const remaining = litres - cans20L * 20
    const cans5L = Math.ceil(remaining / 5)
    setResult({ litres, cans5L, cans20L })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Wall Area (m²)</label>
          <input type="number" min="0" step="0.1" value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. 80" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Coats</label>
          <select value={coats} onChange={e => setCoats(e.target.value)} className={inputClass}>
            <option value="1">1 coat</option>
            <option value="2">2 coats</option>
            <option value="3">3 coats</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Coverage (m²/L)</label>
          <input type="number" min="0.1" step="0.5" value={coverage} onChange={e => setCoverage(e.target.value)} placeholder="e.g. 10" className={inputClass} />
        </div>
      </div>
      <button onClick={calculate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
        Calculate
      </button>
      {result && (
        <div className={resultBox}>
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Paint Results</p>
          <ResultRow label="Total Litres" value={`${result.litres.toFixed(1)} L`} />
          <ResultRow label="20 L Cans" value={`${result.cans20L} can${result.cans20L !== 1 ? 's' : ''}`} />
          <ResultRow label="5 L Cans (remainder)" value={`${result.cans5L} can${result.cans5L !== 1 ? 's' : ''}`} />
        </div>
      )}
    </div>
  )
}

function FlooringCalc() {
  const [area, setArea] = useState('')
  const [waste, setWaste] = useState('10')
  const [tileSize, setTileSize] = useState('600x600')
  const [result, setResult] = useState<{ totalArea: number; tileCount: number } | null>(null)

  const TILE_SIZES: Record<string, { w: number; h: number }> = {
    '300x300': { w: 0.3, h: 0.3 },
    '400x400': { w: 0.4, h: 0.4 },
    '600x600': { w: 0.6, h: 0.6 },
  }

  function calculate() {
    const a = parseFloat(area)
    const w = parseFloat(waste)
    if (!a) return
    const wasteFactor = 1 + (w || 0) / 100
    const totalArea = a * wasteFactor
    const tile = TILE_SIZES[tileSize]
    const tileCount = Math.ceil(totalArea / (tile.w * tile.h))
    setResult({ totalArea, tileCount })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Room Area (m²)</label>
          <input type="number" min="0" step="0.1" value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. 30" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Waste (%)</label>
          <input type="number" min="0" step="1" value={waste} onChange={e => setWaste(e.target.value)} placeholder="e.g. 10" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Tile Size</label>
          <select value={tileSize} onChange={e => setTileSize(e.target.value)} className={inputClass}>
            <option value="300x300">300×300 mm</option>
            <option value="400x400">400×400 mm</option>
            <option value="600x600">600×600 mm</option>
          </select>
        </div>
      </div>
      <button onClick={calculate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
        Calculate
      </button>
      {result && (
        <div className={resultBox}>
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Flooring Results (incl. waste)</p>
          <ResultRow label="Total Area" value={`${result.totalArea.toFixed(2)} m²`} />
          <ResultRow label="Number of Tiles" value={result.tileCount.toLocaleString()} />
        </div>
      )}
    </div>
  )
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'concrete', label: 'Concrete Mix' },
  { id: 'steel', label: 'Steel Rebar' },
  { id: 'earthwork', label: 'Earthwork' },
  { id: 'brick', label: 'Brick/Block' },
  { id: 'load', label: 'Load/Footing' },
  { id: 'plaster', label: 'Plaster' },
  { id: 'paint', label: 'Paint' },
  { id: 'flooring', label: 'Flooring' },
]

export function CalculatorsClient() {
  const [activeTab, setActiveTab] = useState<Tab>('concrete')

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'concrete' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Concrete Mix Calculator</h2>
            <ConcreteCalc />
          </div>
        )}
        {activeTab === 'steel' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Steel Reinforcement Calculator</h2>
            <SteelCalc />
          </div>
        )}
        {activeTab === 'earthwork' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Earthwork / Volume Calculator</h2>
            <EarthworkCalc />
          </div>
        )}
        {activeTab === 'brick' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Brick / Block Calculator</h2>
            <BrickCalc />
          </div>
        )}
        {activeTab === 'load' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Load / Bearing Capacity Calculator</h2>
            <LoadCalc />
          </div>
        )}
        {activeTab === 'plaster' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Plaster Calculator</h2>
            <PlasterCalc />
          </div>
        )}
        {activeTab === 'paint' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Paint Calculator</h2>
            <PaintCalc />
          </div>
        )}
        {activeTab === 'flooring' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Flooring Calculator</h2>
            <FlooringCalc />
          </div>
        )}
      </div>
    </div>
  )
}
