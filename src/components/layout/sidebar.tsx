'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, BookOpen, FileText,
  BarChart3, LogOut, UserCheck, GraduationCap, Clock
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

interface SidebarProps {
  role: UserRole
  userName: string
  userEmail: string
}

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleLabel = { admin: 'Msimamizi', teacher: 'Mwalimu', student: 'Mwanafunzi' }
  const roleColor = { admin: 'bg-purple-100 text-purple-700', teacher: 'bg-blue-100 text-blue-700', student: 'bg-green-100 text-green-700' }

  return (
    <aside className="w-64 bg-white border-l border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Exam Portal</p>
            <p className="text-gray-400 text-xs">مدخل الامتحانات</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-600 text-sm">
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
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems[role].map(({ href, label, arabicLabel, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <div>
              <p className="leading-none">{label}</p>
              <p className="text-xs opacity-60 arabic-text" style={{ fontSize: '0.7rem' }}>{arabicLabel}</p>
            </div>
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Toka — تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}
