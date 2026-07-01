'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ResizablePanelProps {
  children: [React.ReactNode, React.ReactNode]
  defaultSplit?: number
  minLeft?: number
  minRight?: number
  onSplitChange?: (pct: number) => void
  className?: string
}

export function ResizablePanel({
  children,
  defaultSplit = 65,
  minLeft = 400,
  minRight = 280,
  onSplitChange,
  className,
}: ResizablePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [split, setSplit] = useState(defaultSplit)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const totalWidth = rect.width
      const x = e.clientX - rect.left

      const minLeftPct = (minLeft / totalWidth) * 100
      const maxLeftPct = 100 - (minRight / totalWidth) * 100

      let pct = (x / totalWidth) * 100
      pct = Math.max(minLeftPct, Math.min(maxLeftPct, pct))

      setSplit(pct)
      onSplitChange?.(pct)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, minLeft, minRight, onSplitChange])

  return (
    <div
      ref={containerRef}
      className={cn('flex h-full w-full overflow-hidden', className)}
    >
      <div
        className="h-full overflow-auto"
        style={{
          flexBasis: `${split}%`,
          flexShrink: 0,
          transition: isDragging ? 'none' : 'flex-basis 0.15s ease',
        }}
      >
        {children[0]}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleMouseDown}
        className={cn(
          'group relative flex h-full w-1 flex-shrink-0 cursor-col-resize items-center justify-center',
          'bg-[var(--color-border)]',
          'hover:bg-[var(--color-amber)]',
          'transition-colors duration-150',
          isDragging && 'bg-[var(--color-amber)]'
        )}
      >
        <div className="flex flex-col gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1 w-1 rounded-full',
                'bg-[var(--color-text-muted)]',
                'group-hover:bg-white',
                isDragging && 'bg-white'
              )}
            />
          ))}
        </div>
      </div>

      <div
        className="h-full flex-1 overflow-auto"
        style={{
          transition: isDragging ? 'none' : 'flex-basis 0.15s ease',
        }}
      >
        {children[1]}
      </div>
    </div>
  )
}
