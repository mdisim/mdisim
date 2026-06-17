'use client'

interface Props {
  shapeCode: string
  dims: Record<string, number>
  size?: number
  showDims?: boolean
}

function DimLabel({ x, y, text, anchor = 'middle' }: { x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} fontSize={9} fill="#94a3b8" textAnchor={anchor} fontFamily="monospace" fontWeight="bold">{text}</text>
  )
}

function DimLine({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth={0.7} strokeDasharray="2 2" />
}

export function ShapeCodeSVG({ shapeCode, dims, size = 40, showDims = false }: Props) {
  if (!showDims) return <SmallShape shapeCode={shapeCode} size={size} />
  return <DetailedShape shapeCode={shapeCode} dims={dims} />
}

function SmallShape({ shapeCode, size }: { shapeCode: string; size: number }) {
  const s = size
  const stroke = '#f59e0b'
  const sw = Math.max(1.5, size / 20)

  const shapes: Record<string, React.ReactNode> = {
    '00': <line x1={4} y1={s/2} x2={s-4} y2={s/2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />,
    '11': <polyline points={`4,${s-6} 4,8 ${s-4},8`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />,
    '21': <polyline points={`4,8 4,${s-6} ${s-4},${s-6} ${s-4},8`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />,
    '31': <polyline points={`4,8 ${s*0.45},8 ${s*0.55},${s-8} ${s-4},${s-8}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />,
    '41': <polyline points={`4,4 4,${s-4} ${s-4},${s-4} ${s-4},4`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />,
    '51': <rect x={4} y={4} width={s-8} height={s-8} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />,
    '60': <path d={`M${s/2},${s-4} A${s/2-4},${s/2-8} 0 1,1 ${s/2+1},${s-4}`} fill="none" stroke={stroke} strokeWidth={sw} />,
    '99': <text x={s/2} y={s/2+4} textAnchor="middle" fontSize={s*0.5} fill={stroke} fontWeight="bold">?</text>,
  }

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0">
      {shapes[shapeCode] ?? shapes['00']}
    </svg>
  )
}

function DetailedShape({ shapeCode, dims }: { shapeCode: string; dims: Record<string, number> }) {
  const W = 220, H = 140
  const stroke = '#f59e0b'
  const sw = 3
  const A = dims.A, B = dims.B, C = dims.C, D = dims.D

  const shapes: Record<string, React.ReactNode> = {
    '00': (
      <g>
        <line x1={20} y1={H/2} x2={W-20} y2={H/2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <DimLine x1={20} y1={H/2+12} x2={W-20} y2={H/2+12} />
        {A ? <DimLabel x={W/2} y={H/2+24} text={`A=${A}`} /> : null}
      </g>
    ),
    '11': (
      <g>
        <polyline points={`20,${H-20} 20,25 ${W-20},25`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
        {/* A = vertical leg */}
        <DimLine x1={32} y1={25} x2={32} y2={H-20} />
        {A ? <DimLabel x={42} y={H/2+5} text={`A=${A}`} anchor="start" /> : null}
        {/* B = horizontal leg */}
        <DimLine x1={20} y1={13} x2={W-20} y2={13} />
        {B ? <DimLabel x={W/2} y={10} text={`B=${B}`} /> : null}
      </g>
    ),
    '21': (
      <g>
        <polyline points={`20,20 20,${H-20} ${W-20},${H-20} ${W-20},20`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
        {/* A = bottom */}
        <DimLine x1={20} y1={H-8} x2={W-20} y2={H-8} />
        {A ? <DimLabel x={W/2} y={H} text={`A=${A}`} /> : null}
        {/* B = left leg */}
        <DimLine x1={8} y1={20} x2={8} y2={H-20} />
        {B ? <DimLabel x={5} y={H/2+4} text={`B=${B}`} anchor="end" /> : null}
        {/* C = right leg */}
        {C ? <>
          <DimLine x1={W-8} y1={20} x2={W-8} y2={H-20} />
          <DimLabel x={W-5} y={H/2+4} text={`C=${C}`} anchor="start" />
        </> : null}
      </g>
    ),
    '31': (
      <g>
        <polyline points={`20,25 ${W*0.4},25 ${W*0.6},${H-25} ${W-20},${H-25}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
        {/* A = top horizontal */}
        <DimLine x1={20} y1={13} x2={W*0.4} y2={13} />
        {A ? <DimLabel x={(20+W*0.4)/2} y={10} text={`A=${A}`} /> : null}
        {/* B = crank diagonal */}
        <DimLine x1={W*0.4+10} y1={25-5} x2={W*0.6+10} y2={H-25-5} />
        {B ? <DimLabel x={W/2+14} y={H/2-2} text={`B=${B}`} anchor="start" /> : null}
        {/* C = bottom horizontal */}
        <DimLine x1={W*0.6} y1={H-13} x2={W-20} y2={H-13} />
        {C ? <DimLabel x={(W*0.6+W-20)/2} y={H-6} text={`C=${C}`} /> : null}
      </g>
    ),
    '41': (
      <g>
        <polyline points={`20,20 20,${H-20} ${W-20},${H-20} ${W-20},20`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
        {/* A = bottom */}
        <DimLine x1={20} y1={H-8} x2={W-20} y2={H-8} />
        {A ? <DimLabel x={W/2} y={H} text={`A=${A}`} /> : null}
        {/* B = left leg */}
        <DimLine x1={8} y1={20} x2={8} y2={H-20} />
        {B ? <DimLabel x={5} y={H/2+4} text={`B=${B}`} anchor="end" /> : null}
      </g>
    ),
    '51': (
      <g>
        {/* Closed stirrup with hooks */}
        <rect x={25} y={25} width={W-50} height={H-50} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <line x1={25} y1={25} x2={40} y2={12} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <line x1={W-25} y1={25} x2={W-15} y2={12} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        {/* A = horizontal (width) */}
        <DimLine x1={25} y1={H-10} x2={W-25} y2={H-10} />
        {A ? <DimLabel x={W/2} y={H-2} text={`A=${A}`} /> : null}
        {/* B = vertical (height) */}
        <DimLine x1={12} y1={25} x2={12} y2={H-25} />
        {B ? <DimLabel x={9} y={H/2+4} text={`B=${B}`} anchor="end" /> : null}
      </g>
    ),
    '60': (
      <g>
        <ellipse cx={W/2} cy={H/2} rx={W/2-25} ry={H/2-25} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray="6 3" />
        {/* Diameter line */}
        <line x1={W/2-(W/2-25)} y1={H/2} x2={W/2+(W/2-25)} y2={H/2} stroke="#475569" strokeWidth={0.7} />
        {B ? <DimLabel x={W/2} y={H/2+4} text={`Ø${B}`} /> : null}
        {A ? <DimLabel x={W/2} y={H-6} text={`pitch=${A}`} /> : null}
      </g>
    ),
    '99': (
      <g>
        <text x={W/2} y={H/2} textAnchor="middle" fontSize={24} fill={stroke} fontWeight="bold" dominantBaseline="central">Custom</text>
        {A ? <DimLabel x={W/2} y={H-8} text={`A=${A}${B ? ` B=${B}` : ''}${C ? ` C=${C}` : ''}${D ? ` D=${D}` : ''}`} /> : null}
      </g>
    ),
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="bg-slate-800/50 rounded">
      {shapes[shapeCode] ?? shapes['00']}
    </svg>
  )
}
