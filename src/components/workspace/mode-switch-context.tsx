'use client'

import { createContext, useContext } from 'react'
import type { Mode } from './workspace-shell'

const ModeSwitchContext = createContext<((mode: Mode) => void) | null>(null)

export function ModeSwitchProvider({ setMode, children }: { setMode: (mode: Mode) => void; children: React.ReactNode }) {
  return <ModeSwitchContext.Provider value={setMode}>{children}</ModeSwitchContext.Provider>
}

/** Lets an empty state chain straight into the mode that would fill it — e.g. "Go to Takeoff" from an empty Measurement Book. */
export function useModeSwitch() {
  const ctx = useContext(ModeSwitchContext)
  if (!ctx) throw new Error('useModeSwitch must be used within ModeSwitchProvider')
  return ctx
}
