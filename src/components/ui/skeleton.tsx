import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

type SkeletonProps = HTMLAttributes<HTMLDivElement>

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-slate-200 dark:bg-slate-700 animate-pulse rounded',
        className
      )}
      {...props}
    />
  )
}

function TableSkeleton({ rows = 5, columns = 4, className }: SkeletonProps & { rows?: number; columns?: number }) {
  return (
    <div className={cn('w-full space-y-3', className)}>
      {/* Header row */}
      <div className="flex gap-4 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1 rounded" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={`row-${rowIdx}`} className="flex gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={`cell-${rowIdx}-${colIdx}`} className="h-4 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}

function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      'bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md p-6 space-y-4',
      className
    )}>
      {/* Header */}
      <Skeleton className="h-6 w-3/4 rounded" />
      {/* Content lines */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
        <Skeleton className="h-4 w-4/5 rounded" />
      </div>
      {/* Footer action */}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  )
}

function PageSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Header section */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-2/3 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
      {/* Content section with sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`sidebar-${i}`} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        {/* Main content */}
        <div className="lg:col-span-3 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`content-block-${i}`} className="space-y-2">
              <Skeleton className="h-5 w-1/3 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { Skeleton, TableSkeleton, CardSkeleton, PageSkeleton }
