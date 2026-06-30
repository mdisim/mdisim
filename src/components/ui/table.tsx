import { cn } from '@/lib/utils'
import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('sticky top-0 z-10 bg-[var(--color-surface)] backdrop-blur-sm', className)} {...props} />
}

function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        'divide-y divide-[var(--color-border)] [&>tr:nth-child(even)]:bg-[var(--color-surface)]/40',
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'hover:bg-[var(--color-amber)]/[0.06] transition-colors',
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, scope = 'col', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope={scope}
      className={cn(
        'px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider border-b border-[var(--color-border)]',
        'text-[var(--color-text-secondary)]',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 text-[var(--color-text)]', className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
