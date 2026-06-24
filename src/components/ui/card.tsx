import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200 shadow-md hover:shadow-xl transition-shadow duration-300',
        'dark:bg-slate-800/50 dark:border-slate-700 dark:shadow-slate-900/30 dark:hover:shadow-slate-900/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-b border-slate-100 bg-slate-50/50',
        'dark:border-slate-700 dark:bg-slate-800/80',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <h3 className={cn('text-base font-bold text-slate-900 dark:text-slate-100', className)} {...props}>
      {children}
    </h3>
  )
}

function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('px-6 py-5', className)} {...props}>
      {children}
    </div>
  )
}

function CardFooter({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-slate-100',
        'dark:border-slate-700',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Card, CardHeader, CardTitle, CardContent, CardFooter }
