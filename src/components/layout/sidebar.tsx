'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, BookOpen, FileText,
  BarChart3, LogOut, UserCheck, GraduationCap,
  Clock, Menu, X,
} from 'lucide-react'
import type { UserRole } from '@/types'

const navItems: Record<UserRole, { href: string; label: string; arabicLabel: string; icon: React.ElementType }[]> = {
  admin: [
    { href: '/admin/dashboard',  label: 'Dashboard',   arabicLabel: 'لوحة التحكم',  icon: LayoutDashboard },
    { href: '/admin/users',      label: 'Watumiaji',   arabicLabel: 'المستخدمون',    icon: Users },
    { href: '/admin/assign',     label: 'Assign',      arabicLabel: 'تعيين',         icon: UserCheck },
    { href: '/admin/exams',      label: 'Mitihani',    arabicLabel: 'الامتحانات',     icon: BookOpen },
    { href: '/admin/reports',    label: 'Ripoti',      arabicLabel: 'التقارير',       icon: BarChart3 },
  ],
  teacher: [
    { href: '/teacher/dashboard', label: 'Dashboard', arabicLabel: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/teacher/students',  label: 'Wanafunzi', arabicLabel: 'طلابي',        icon: GraduationCap },
    { href: '/teacher/exams',     label: 'Mitihani',  arabicLabel: 'امتحاناتي',    icon: BookOpen },
    { href: '/teacher/results',   label: 'Matokeo',   arabicLabel: 'النتائج',      icon: BarChart3 },
  ],
  student: [
    { href: '/student/dashboard', label: 'Dashboard', arabicLabel: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/student/exams',     label: 'Mitihani',  arabicLabel: 'امتحاناتي',    icon: Clock },
    { href: '/student/results',   label: 'Matokeo',   arabicLabel: 'نتائجي',       icon: FileText },
  ],
}

const roleLabel = { admin: 'Msimamizi', teacher: 'Mwalimu', student: 'Mwanafunzi' }
const roleColor = {
  admin:   'bg-purple-100 text-purple-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-green-100 text-green-700',
}

interface SidebarProps {
  role: UserRole
  userName: string
  userEmail: string
}

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const items = navItems[role]

  return (
    <>
      {/* ── Toggle button — inaonekana kila wakati ── */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-50 w-10 h-10 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
        title={open ? 'Funga menyu' : 'Fungua menyu'}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* ── Overlay (mobile) ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar panel ── */}
      {open && (
        <aside className="fixed top-0 left-0 bottom-0 z-50 w-64 bg-white shadow-2xl flex flex-col">
          {/* Logo + close */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Exam Portal</p>
                <p className="text-gray-400 text-xs">مدخل الامتحانات</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-600 text-sm shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{userName}</p>
                <p className="text-gray-400 text-xs truncate">{userEmail}</p>
              </div>
            </div>
            <span className={cn('mt-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full', roleColor[role])}>
              {roleLabel[role]}
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {items.map(({ href, label, arabicLabel, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors',
                    active
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="leading-none">{label}</p>
                    <p className="text-xs opacity-60 mt-0.5">{arabicLabel}</p>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Toka — تسجيل الخروج
            </button>
          </div>
        </aside>
      )}
    </>
  )
}
