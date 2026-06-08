'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, BookOpen, FileText,
  BarChart3, LogOut, UserCheck, GraduationCap,
  Clock, Menu, X, PanelRightClose, PanelRightOpen,
} from 'lucide-react'
import type { UserRole } from '@/types'

const navItems: Record<UserRole, { href: string; label: string; arabicLabel: string; icon: React.ElementType }[]> = {
  admin: [
    { href: '/admin/dashboard', label: 'Dashboard', arabicLabel: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Watumiaji', arabicLabel: 'المستخدمون', icon: Users },
    { href: '/admin/assign', label: 'Assign Wanafunzi', arabicLabel: 'تعيين الطلاب', icon: UserCheck },
    { href: '/admin/exams', label: 'Mitihani Yote', arabicLabel: 'جميع الامتحانات', icon: BookOpen },
    { href: '/admin/reports', label: 'Ripoti', arabicLabel: 'التقارير', icon: BarChart3 },
  ],
  teacher: [
    { href: '/teacher/dashboard', label: 'Dashboard', arabicLabel: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/teacher/students', label: 'Wanafunzi Wangu', arabicLabel: 'طلابي', icon: GraduationCap },
    { href: '/teacher/exams', label: 'Mitihani Yangu', arabicLabel: 'امتحاناتي', icon: BookOpen },
    { href: '/teacher/results', label: 'Matokeo', arabicLabel: 'النتائج', icon: BarChart3 },
  ],
  student: [
    { href: '/student/dashboard', label: 'Dashboard', arabicLabel: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/student/exams', label: 'Mitihani Yangu', arabicLabel: 'امتحاناتي', icon: Clock },
    { href: '/student/results', label: 'Matokeo Yangu', arabicLabel: 'نتائجي', icon: FileText },
  ],
}

const roleLabel = { admin: 'Msimamizi', teacher: 'Mwalimu', student: 'Mwanafunzi' }
const roleColor = {
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-green-100 text-green-700',
}

interface SidebarProps {
  role: UserRole
  userName: string
  userEmail: string
  open: boolean
  onToggle: () => void
  onClose: () => void
}

export function Sidebar({ role, userName, userEmail, open, onToggle, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  function closeOnMobile() {
    if (window.innerWidth < 1024) onClose()
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) throw error

      onClose()
      router.replace('/login')
      router.refresh()
      window.location.assign('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      setLoggingOut(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'fixed top-3 z-[60] hidden h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-all hover:bg-gray-50 lg:flex',
          open ? 'right-[16.75rem]' : 'right-3'
        )}
        aria-label={open ? 'Ficha menyu' : 'Fungua menyu'}
        title={open ? 'Ficha menyu' : 'Fungua menyu'}
      >
        {open ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
      </button>

      <button
        type="button"
        onClick={onToggle}
        className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 lg:hidden"
        aria-label={open ? 'Funga menyu' : 'Fungua menyu'}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed bottom-0 right-0 top-0 z-50 flex w-64 flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">Exam Portal</p>
              <p className="truncate text-xs text-gray-400">مدخل الامتحانات</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            aria-label="Funga menyu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
              <p className="truncate text-xs text-gray-400">{userEmail}</p>
            </div>
          </div>
          <span className={cn('mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium', roleColor[role])}>
            {roleLabel[role]}
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems[role].map(({ href, label, arabicLabel, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={closeOnMobile}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors',
                  active
                    ? 'bg-blue-50 font-semibold text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate leading-none">{label}</p>
                  <p className="mt-0.5 truncate text-xs opacity-60">{arabicLabel}</p>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-100 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
          >
            <LogOut className="h-5 w-5" />
            <span>{loggingOut ? 'Inatoka...' : 'Toka - تسجيل الخروج'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
