'use client'

import React from 'react'
import { List } from 'react-window'
import type { CSSProperties, ReactElement } from 'react'

export interface VirtualTableColumn<T> {
  key: string
  header: React.ReactNode
  width?: string
  className?: string
  render: (item: T, index: number) => React.ReactNode
}

export interface VirtualTableProps<T> {
  columns: VirtualTableColumn<T>[]
  data: T[]
  rowHeight?: number
  height?: number
  onRowClick?: (item: T, index: number) => void
  rowClassName?: (item: T, index: number) => string
  headerClassName?: string
  getRowKey?: (item: T, index: number) => string
}

interface RowRendererProps {
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
  index: number
  style: CSSProperties
  // Extra props from rowProps
  items: unknown[]
  columns: VirtualTableColumn<unknown>[]
  onRowClick?: (item: unknown, index: number) => void
  rowClassName?: (item: unknown, index: number) => string
}

function RowRenderer({ index, style, items, columns, onRowClick, rowClassName, ariaAttributes }: RowRendererProps): ReactElement {
  const item = items[index]
  const extraClass = rowClassName ? rowClassName(item, index) : ''

  return (
    <div
      {...ariaAttributes}
      style={style}
      className={`flex items-center ${extraClass}`}
      onClick={onRowClick ? () => onRowClick(item, index) : undefined}
    >
      {columns.map((col) => (
        <div key={col.key} className={col.className} style={col.width ? { width: col.width, flexShrink: 0 } : { flex: 1 }}>
          {col.render(item, index)}
        </div>
      ))}
    </div>
  )
}

export function VirtualTable<T>({
  columns,
  data,
  rowHeight = 40,
  height = 600,
  onRowClick,
  rowClassName,
  headerClassName,
}: VirtualTableProps<T>) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className={`flex items-center ${headerClassName ?? ''}`}>
        {columns.map((col) => (
          <div key={col.key} className={col.className} style={col.width ? { width: col.width, flexShrink: 0 } : { flex: 1 }}>
            {col.header}
          </div>
        ))}
      </div>
      {/* Virtualized body */}
      <List
        rowCount={data.length}
        rowHeight={rowHeight}
        rowComponent={RowRenderer as never}
        rowProps={{
          items: data,
          columns: columns as VirtualTableColumn<unknown>[],
          onRowClick: onRowClick as ((item: unknown, index: number) => void) | undefined,
          rowClassName: rowClassName as ((item: unknown, index: number) => string) | undefined,
        }}
        style={{ height, width: '100%' }}
      />
    </div>
  )
}
