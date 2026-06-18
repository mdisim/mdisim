'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface AdminModeContextType {
  isAdmin: boolean
  setIsAdmin: (v: boolean) => void
}

const AdminModeContext = createContext<AdminModeContextType>({
  isAdmin: false,
  setIsAdmin: () => {},
})

export function AdminModeProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('angel-dc-admin-mode')
    if (stored === 'true') setIsAdmin(true)
  }, [])

  const toggle = (v: boolean) => {
    setIsAdmin(v)
    localStorage.setItem('angel-dc-admin-mode', String(v))
  }

  return (
    <AdminModeContext.Provider value={{ isAdmin, setIsAdmin: toggle }}>
      {children}
    </AdminModeContext.Provider>
  )
}

export function useAdminMode() {
  return useContext(AdminModeContext)
}
