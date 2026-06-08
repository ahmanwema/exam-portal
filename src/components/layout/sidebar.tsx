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
    { href: '/admin/dashboard',  label: 'Dashboard',        arabicLabel: 'لوحة التحكم',      icon: LayoutDashboard },
    { href: '/admin/users',      label: 'Watumiaji',        arabicLabel: 'المستخدمون',        icon: Users },
    { href: '/admin/assign',     label: 'Assign Wanafunzi', arabicLabel: 'تعيين الطلاب',      icon: UserCheck },
    { href: '/admin/exams',      label: 'Mitihani Yote',    arabicLabel: 'جميع الامتحانات',   icon: BookOpen },
    { href: '/admin/reports',    label: 'Ripoti',           arabicLabel: 'التقارير',          icon: BarChart3 },
  ],
  teacher: [
    { href: '/teacher/dashboard', label: 'Dashboard',        arabicLabel: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/teacher/students',  label: 'Wanafunzi Wangu',  arabicLabel: 'طلابي',        icon: GraduationCap },
    { href: '/teacher/exams',     label: 'Mitihani Yangu',   arabicLabel: 'امتحاناتي',    icon: BookOpen },
    { href: '/teacher/results',   label: 'Matokeo',          arabicLabel: 'النتائج',      icon: BarChart3 },
  ],
  student: [
    { href: '/student/dashboard', label: 'Dashboard',      arabicLabel: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/student/exams',     label: 'Mitihani Yangu', arabicLabel: 'امتحاناتي',    icon: Clock },
    { href: '/student/results',   label: 'Matokeo Yangu',  arabicLabel: 'نتائجي',       icon: FileText },
  ],
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

  const roleLabel = { admin: 'Msimamizi', teacher: 'Mwalimu', student: 'Mwanafunzi' }
  const roleColor = {
    admin:   'bg-purple-100 text-purple-700',
    teacher: 'bg-blue-100   text-blue-700',
    student: 'bg-green-100  text-green-700',
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">Exam Portal</p>
            <p className="text-gray-400 text-xs mt-0.5">مدخل الامتحانات</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          className="lg:hidden text-gray-400 hover:text-gray-600 p-1"
          onClick={() => setOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-gray-100">
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

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems[role].map(({ href, label, arabicLabel, icon: Icon }) => {
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
    </div>
  )

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          className="text-gray-600 hover:text-gray-900 p-1"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">Exam Portal</span>
        </div>
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-600 text-sm">
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* ── Mobile overlay ─────────────────────────────── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ──────────────────────────────── */}
      <div className={cn(
        'lg:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-white shadow-2xl transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        <SidebarContent />
      </div>

      {/* ── Desktop sidebar ────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-l border-gray-200 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}
