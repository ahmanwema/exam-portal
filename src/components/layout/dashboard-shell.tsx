'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import type { UserRole } from '@/types'

interface DashboardShellProps {
  children: React.ReactNode
  role: UserRole
  userName: string
  userEmail: string
}

export function DashboardShell({ children, role, userName, userEmail }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSidebarOpen(window.matchMedia('(min-width: 1024px)').matches)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onClose={() => setSidebarOpen(false)}
      />
      <main
        className={cn(
          'min-w-0 overflow-x-hidden pt-14 transition-[padding] duration-300 lg:pt-0',
          sidebarOpen ? 'lg:pr-64' : 'lg:pr-0'
        )}
      >
        {children}
      </main>
    </div>
  )
}
