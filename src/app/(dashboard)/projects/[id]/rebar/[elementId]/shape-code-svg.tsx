'use client'

interface Props {
  shapeCode: string
  dims: Record<string, number>
  size?: number
}

// Renders a simple SVG icon representing the bar shape
export function ShapeCodeSVG({ shapeCode, size = 40 }: Props) {
  const s = size
  const stroke = '#f59e0b'
  const sw = Math.max(1.5, size / 20)

  const shapes: Record<string, React.ReactNode> = {
    '00': ( // straight
      <line x1={4} y1={s/2} x2={s-4} y2={s/2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    ),
    '11': ( // L-bar
      <polyline points={`4,${s-6} 4,8 ${s-4},8`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
    ),
    '21': ( // U-bar
      <polyline points={`4,8 4,${s-6} ${s-4},${s-6} ${s-4},8`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
    ),
    '31': ( // Z-bar (crank)
      <polyline points={`4,8 ${s*0.45},8 ${s*0.55},${s-8} ${s-4},${s-8}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
    ),
    '41': ( // Open U-stirrup
      <polyline points={`4,4 4,${s-4} ${s-4},${s-4} ${s-4},4`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
    ),
    '51': ( // Closed stirrup
      <rect x={4} y={4} width={s-8} height={s-8} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
    ),
    '60': ( // Spiral
      <path d={`M${s/2},${s-4} A${s/2-4},${s/2-8} 0 1,1 ${s/2+1},${s-4}`} fill="none" stroke={stroke} strokeWidth={sw} />
    ),
    '99': ( // Custom — question mark style
      <text x={s/2} y={s/2+4} textAnchor="middle" fontSize={s*0.5} fill={stroke} fontWeight="bold">?</text>
    ),
  }

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0">
      {shapes[shapeCode] ?? shapes['00']}
    </svg>
  )
}
