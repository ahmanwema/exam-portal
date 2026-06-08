import { createClient } from '@/lib/supabase/server'
import { Users, BookOpen, GraduationCap, Clock, CheckCircle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: totalStudents },
    { count: totalTeachers },
    { count: pendingTeachers },
    { count: totalExams },
    { count: totalAttempts },
    { data: recentAttempts },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher').eq('status', 'approved'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher').eq('status', 'pending'),
    supabase.from('exams').select('*', { count: 'exact', head: true }),
    supabase.from('exam_attempts').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('exam_attempts')
      .select('id, started_at, score, percentage, status, profiles!student_id(full_name), exams!exam_id(title)')
      .order('started_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: 'Wanafunzi', arabicLabel: 'الطلاب', value: totalStudents ?? 0, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50', href: '/admin/users' },
    { label: 'Walimu', arabicLabel: 'المعلمون', value: totalTeachers ?? 0, icon: Users, color: 'text-green-600', bg: 'bg-green-50', href: '/admin/users' },
    { label: 'Mitihani', arabicLabel: 'الامتحانات', value: totalExams ?? 0, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50', href: '/admin/exams' },
    { label: 'Majibu Yaliyowasilishwa', arabicLabel: 'الإجابات المقدمة', value: totalAttempts ?? 0, icon: CheckCircle, color: 'text-orange-600', bg: 'bg-orange-50', href: '/admin/reports' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard ya Admin</h1>
        <p className="text-gray-500 text-sm arabic-text">لوحة تحكم المسؤول</p>
      </div>

      {/* Pending teachers alert */}
      {(pendingTeachers ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">
                Walimu {pendingTeachers} wanasubiri idhini
              </p>
              <p className="text-amber-600 text-sm arabic-text">معلمون ينتظرون الموافقة</p>
            </div>
          </div>
          <Link href="/admin/users?filter=pending" className="bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700">
            Angalia
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, arabicLabel, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-600 mt-1">{label}</p>
                <p className="text-xs text-gray-400 arabic-text">{arabicLabel}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/users" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 flex items-center gap-3 transition-colors">
          <Users className="w-6 h-6" />
          <div>
            <p className="font-medium">Simamia Watumiaji</p>
            <p className="text-blue-200 text-xs arabic-text">إدارة المستخدمين</p>
          </div>
        </Link>
        <Link href="/admin/assign" className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-4 flex items-center gap-3 transition-colors">
          <TrendingUp className="w-6 h-6" />
          <div>
            <p className="font-medium">Assign Wanafunzi</p>
            <p className="text-green-200 text-xs arabic-text">تعيين الطلاب للمعلمين</p>
          </div>
        </Link>
        <Link href="/admin/reports" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-4 flex items-center gap-3 transition-colors">
          <BookOpen className="w-6 h-6" />
          <div>
            <p className="font-medium">Angalia Ripoti</p>
            <p className="text-purple-200 text-xs arabic-text">عرض التقارير</p>
          </div>
        </Link>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shughuli za Hivi Karibuni</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentAttempts?.length ? (
            <p className="text-gray-400 text-sm text-center py-4">Hakuna shughuli bado</p>
          ) : (
            <div className="space-y-3">
              {(recentAttempts as unknown as Array<{ id: string; started_at: string; percentage: number | null; status: string; profiles: { full_name: string } | null; exams: { title: string } | null }>).map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {attempt.profiles?.full_name}
                    </p>
                    <p className="text-xs text-gray-500">{attempt.exams?.title}</p>
                    <p className="text-xs text-gray-400">{formatDate(attempt.started_at)}</p>
                  </div>
                  <div className="text-right">
                    {attempt.percentage != null && (
                      <p className="font-bold text-gray-900">{attempt.percentage}%</p>
                    )}
                    <Badge variant={attempt.status === 'submitted' ? 'success' : 'secondary'}>
                      {attempt.status === 'submitted' ? 'Imewasilishwa' : attempt.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
