'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseResizableOptions {
  direction: 'horizontal' | 'vertical'
  initialSize: number
  minSize: number
  maxSize: number
  storageKey?: string
}

export function useResizable({ direction, initialSize, minSize, maxSize, storageKey }: UseResizableOptions) {
  const [size, setSize] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`workspace-${storageKey}`)
      if (saved) return Math.max(minSize, Math.min(maxSize, parseInt(saved, 10)))
    }
    return initialSize
  })
  const [isResizing, setIsResizing] = useState(false)
  const startPos = useRef(0)
  const startSize = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY
    startSize.current = size
  }, [direction, size])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = direction === 'horizontal'
        ? e.clientX - startPos.current
        : e.clientY - startPos.current
      const newSize = Math.max(minSize, Math.min(maxSize, startSize.current + delta))
      setSize(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      if (storageKey) {
        localStorage.setItem(`workspace-${storageKey}`, String(size))
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, direction, minSize, maxSize, storageKey, size])

  return { size, isResizing, handleMouseDown, setSize }
}
