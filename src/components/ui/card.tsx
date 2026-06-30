import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border transition-shadow duration-300',
        'bg-[var(--color-surface-elevated)] border-[var(--color-border)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lg)]',
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
        'px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50',
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
    <h3 className={cn('text-base font-bold text-[var(--color-text)]', className)} {...props}>
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
        'px-6 py-4 border-t border-[var(--color-border)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Card, CardHeader, CardTitle, CardContent, CardFooter }
