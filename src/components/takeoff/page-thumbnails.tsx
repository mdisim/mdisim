'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface PageThumbnailsProps {
  pdfDoc: unknown
  currentPage: number
  pageCount: number
  onPageChange: (page: number) => void
}

const THUMB_WIDTH = 120
const THUMB_SCALE = 0.3

export function PageThumbnails({ pdfDoc, currentPage, pageCount, onPageChange }: PageThumbnailsProps) {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  const renderThumbnail = useCallback(async (pageNum: number) => {
    if (!pdfDoc || thumbnails.has(pageNum)) return
    const doc = pdfDoc as {
      getPage: (n: number) => Promise<{
        getViewport: (o: { scale: number }) => { width: number; height: number }
        render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> }
      }>
    }
    const pg = await doc.getPage(pageNum)
    const viewport = pg.getViewport({ scale: THUMB_SCALE })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await pg.render({ canvasContext: ctx, viewport }).promise
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
    setThumbnails(prev => new Map(prev).set(pageNum, dataUrl))
  }, [pdfDoc, thumbnails])

  useEffect(() => {
    if (!pdfDoc || pageCount <= 1) return
    const pages = [currentPage]
    if (currentPage > 1) pages.unshift(currentPage - 1)
    if (currentPage < pageCount) pages.push(currentPage + 1)
    for (let i = 1; i <= pageCount; i++) {
      if (!pages.includes(i)) pages.push(i)
    }
    let cancelled = false
    ;(async () => {
      for (const p of pages) {
        if (cancelled) break
        await renderThumbnail(p)
      }
    })()
    return () => { cancelled = true }
  }, [pdfDoc, pageCount, currentPage, renderThumbnail])

  useEffect(() => {
    if (!containerRef.current) return
    const active = containerRef.current.querySelector('[data-active="true"]')
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentPage])

  if (pageCount <= 1) return null

  return (
    <div
      ref={containerRef}
      className="flex-shrink-0 w-[140px] bg-slate-100 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 overflow-y-auto py-2 px-2 space-y-2 hidden md:block"
    >
      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 mb-1">
        Pages
      </div>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          data-active={p === currentPage}
          onClick={() => onPageChange(p)}
          className={cn(
            'w-full rounded-lg overflow-hidden border-2 transition-all',
            p === currentPage
              ? 'border-blue-500 shadow-md shadow-blue-500/20'
              : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600',
          )}
        >
          <div className="relative bg-white dark:bg-slate-700">
            {thumbnails.has(p) ? (
              <img
                src={thumbnails.get(p)!}
                alt={`Page ${p}`}
                className="w-full h-auto"
                style={{ maxWidth: THUMB_WIDTH }}
              />
            ) : (
              <div className="w-full aspect-[3/4] flex items-center justify-center">
                <div className="animate-pulse w-8 h-8 rounded bg-slate-200 dark:bg-slate-600" />
              </div>
            )}
            <div className={cn(
              'absolute bottom-0 inset-x-0 text-center py-0.5 text-[10px] font-medium',
              p === currentPage
                ? 'bg-blue-500 text-white'
                : 'bg-black/40 text-white'
            )}>
              {p}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
