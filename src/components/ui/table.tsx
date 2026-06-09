import { cn } from '@/lib/utils'
import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-slate-50', className)} {...props} />
}

function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-slate-200', className)} {...props} />
}

function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('hover:bg-slate-50 transition-colors', className)} {...props} />
}

function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 text-slate-700', className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
