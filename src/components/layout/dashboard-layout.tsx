import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from './sidebar'
import type { UserRole } from '@/types'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: UserRole
}

export async function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, status')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== role) redirect(`/${profile.role}/dashboard`)
  if (profile.status === 'pending')   redirect('/pending')
  if (profile.status === 'suspended') redirect('/suspended')

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      <Sidebar role={role} userName={profile.full_name} userEmail={profile.email} />
      {/* Content — adds top padding on mobile for the fixed top bar */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
