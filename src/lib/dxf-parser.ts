export interface DXFLayer {
  name: string
  color: number
  lineType: string
  visible: boolean
}

export interface DXFEntity {
  type: string
  layer: string
  color?: number
  vertices?: { x: number; y: number }[]
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  center?: { x: number; y: number }
  radius?: number
  startAngle?: number
  endAngle?: number
  text?: string
  closed?: boolean
}

export interface DXFParseResult {
  layers: DXFLayer[]
  entities: DXFEntity[]
  extents: { minX: number; minY: number; maxX: number; maxY: number }
  units: number
}

export const ACI_COLORS: Record<number, string> = {
  1: '#FF0000', 2: '#FFFF00', 3: '#00FF00', 4: '#00FFFF',
  5: '#0000FF', 6: '#FF00FF', 7: '#FFFFFF', 8: '#808080', 9: '#C0C0C0',
}

export function aciToHex(index: number): string {
  return ACI_COLORS[index] ?? `#${((index * 0x1F2E3D) % 0xFFFFFF).toString(16).padStart(6, '0')}`
}

export function parseDXF(content: string): DXFParseResult {
  const lines = content.split('\n').map(l => l.trim())

  // Build group-code / value pairs
  const pairs: { code: number; value: string }[] = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i], 10)
    if (!isNaN(code)) {
      pairs.push({ code, value: lines[i + 1] ?? '' })
    }
  }

  const layers: DXFLayer[] = []
  const entities: DXFEntity[] = []
  let units = 0

  let section = ''
  let inLayerTable = false

  // Layer accumulator
  let layerName = ''
  let layerColor = 7
  let layerFlags = 0
  let layerLineType = 'CONTINUOUS'
  let inLayerEntry = false

  // Entity accumulator
  let currentEntity: DXFEntity | null = null
  let pendingX = 0
  let pendingX1 = 0
  let hasPendingX = false
  let hasPendingX1 = false

  function flushLayer() {
    if (inLayerEntry && layerName) {
      layers.push({
        name: layerName,
        color: Math.abs(layerColor),
        lineType: layerLineType,
        visible: (layerFlags & 1) === 0,
      })
    }
    inLayerEntry = false
    layerName = ''
    layerColor = 7
    layerFlags = 0
    layerLineType = 'CONTINUOUS'
  }

  function flushEntity() {
    if (currentEntity) {
      entities.push(currentEntity)
    }
    currentEntity = null
    hasPendingX = false
    hasPendingX1 = false
  }

  const ENTITY_TYPES = new Set(['LINE', 'LWPOLYLINE', 'CIRCLE', 'ARC', 'TEXT', 'MTEXT', 'DIMENSION', 'HATCH'])

  for (let i = 0; i < pairs.length; i++) {
    const { code, value } = pairs[i]

    // Section tracking
    if (code === 0 && value === 'SECTION') {
      const next = pairs[i + 1]
      if (next && next.code === 2) {
        section = next.value
        inLayerTable = false
      }
      continue
    }
    if (code === 0 && value === 'ENDSEC') {
      if (section === 'ENTITIES') flushEntity()
      if (section === 'TABLES') flushLayer()
      section = ''
      inLayerTable = false
      continue
    }

    // HEADER section — look for $INSUNITS
    if (section === 'HEADER') {
      if (code === 9 && value === '$INSUNITS') {
        const next = pairs[i + 1]
        if (next && next.code === 70) {
          units = parseInt(next.value, 10)
        }
      }
      continue
    }

    // TABLES section — parse LAYER entries
    if (section === 'TABLES') {
      if (code === 0 && value === 'TABLE' && pairs[i + 1]?.value === 'LAYER') {
        inLayerTable = true
        continue
      }
      if (code === 0 && value === 'ENDTAB') {
        flushLayer()
        inLayerTable = false
        continue
      }
      if (!inLayerTable) continue

      if (code === 0 && value === 'LAYER') {
        flushLayer()
        inLayerEntry = true
        continue
      }
      if (inLayerEntry) {
        if (code === 2) layerName = value
        else if (code === 62) layerColor = parseInt(value, 10)
        else if (code === 70) layerFlags = parseInt(value, 10)
        else if (code === 6) layerLineType = value
      }
      continue
    }

    // ENTITIES section
    if (section === 'ENTITIES') {
      if (code === 0) {
        flushEntity()
        if (ENTITY_TYPES.has(value)) {
          currentEntity = { type: value, layer: '0' }
        }
        continue
      }

      if (!currentEntity) continue

      if (code === 8) {
        currentEntity.layer = value
      } else if (code === 62) {
        currentEntity.color = parseInt(value, 10)
      } else if (code === 10) {
        // X coordinate — could be start.x, center.x, or vertex x
        pendingX = parseFloat(value)
        hasPendingX = true
      } else if (code === 20 && hasPendingX) {
        // Y coordinate paired with group 10
        const y = parseFloat(value)
        const x = pendingX
        hasPendingX = false

        const t = currentEntity.type
        if (t === 'LINE') {
          if (!currentEntity.start) {
            currentEntity.start = { x, y }
          }
        } else if (t === 'CIRCLE' || t === 'ARC') {
          if (!currentEntity.center) {
            currentEntity.center = { x, y }
          }
        } else if (t === 'LWPOLYLINE') {
          if (!currentEntity.vertices) currentEntity.vertices = []
          currentEntity.vertices.push({ x, y })
        } else if (t === 'TEXT' || t === 'MTEXT' || t === 'DIMENSION') {
          if (!currentEntity.vertices) currentEntity.vertices = []
          if (currentEntity.vertices.length === 0) {
            currentEntity.vertices.push({ x, y })
          }
        }
      } else if (code === 11) {
        // Second X coordinate (LINE end)
        pendingX1 = parseFloat(value)
        hasPendingX1 = true
      } else if (code === 21 && hasPendingX1) {
        const y = parseFloat(value)
        hasPendingX1 = false
        if (currentEntity.type === 'LINE') {
          currentEntity.end = { x: pendingX1, y }
        }
      } else if (code === 40) {
        currentEntity.radius = parseFloat(value)
      } else if (code === 50) {
        currentEntity.startAngle = parseFloat(value)
      } else if (code === 51) {
        currentEntity.endAngle = parseFloat(value)
      } else if (code === 70) {
        if (currentEntity.type === 'LWPOLYLINE') {
          currentEntity.closed = (parseInt(value, 10) & 1) === 1
        }
      } else if (code === 90) {
        // vertex count for LWPOLYLINE — no-op, we collect dynamically
      } else if (code === 1) {
        currentEntity.text = value
      } else if (code === 42) {
        // dimValue — store as text if no group 1
        if (!currentEntity.text) currentEntity.text = value
      }
    }
  }

  // Compute extents
  const allPoints: { x: number; y: number }[] = []
  for (const e of entities) {
    if (e.vertices) allPoints.push(...e.vertices)
    if (e.start) allPoints.push(e.start)
    if (e.end) allPoints.push(e.end)
    if (e.center) {
      const r = e.radius ?? 0
      allPoints.push(
        { x: e.center.x - r, y: e.center.y - r },
        { x: e.center.x + r, y: e.center.y + r },
      )
    }
  }

  let extents = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  if (allPoints.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of allPoints) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
    extents = { minX, minY, maxX, maxY }
  }

  return { layers, entities, extents, units }
}
