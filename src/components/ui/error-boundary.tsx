'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackTitle?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-8 bg-[var(--background)]">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 flex items-center justify-center">
            <AlertTriangle size={22} className="text-[var(--color-danger)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text)]">{this.props.fallbackTitle ?? 'Something went wrong'}</p>
          <p className="text-xs text-[var(--color-text-muted)] max-w-sm text-center">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--color-amber)] text-[var(--color-on-amber)] rounded-lg hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
