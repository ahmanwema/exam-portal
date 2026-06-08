import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, BookOpen, CheckCircle, Plus } from 'lucide-react'
import Link from 'next/link'
import { formatDuration } from '@/lib/utils'
import type { ExamStatus } from '@/types'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'

interface RecentExam {
  id: string
  title: string
  status: ExamStatus
  duration_minutes: number
  total_marks: number
  created_at: string
}

interface RecentAttempt {
  id: string
  submitted_at: string | null
  score: number | null
  percentage: number | null
  profiles: { full_name: string } | null
  exams: { title: string } | null
}

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { count: totalStudents },
    { count: totalExams },
    { count: publishedExams },
    { data: recentExams },
    { data: recentAttempts },
  ] = await Promise.all([
    supabase.from('teacher_students').select('*', { count: 'exact', head: true }).eq('teacher_id', user!.id),
    supabase.from('exams').select('*', { count: 'exact', head: true }).eq('teacher_id', user!.id),
    supabase.from('exams').select('*', { count: 'exact', head: true }).eq('teacher_id', user!.id).eq('status', 'published'),
    supabase.from('exams').select('id, title, status, duration_minutes, total_marks, created_at').eq('teacher_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('exam_attempts')
      .select('id, submitted_at, score, percentage, profiles!student_id(full_name), exams!exam_id(title)')
      .eq('exams.teacher_id', user!.id)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(5),
  ])

  const statusLabel: Record<ExamStatus, string> = { draft: 'Rasimu', published: 'Imechapishwa', closed: 'Imefungwa' }
  const statusVariant: Record<ExamStatus, BadgeVariant> = { draft: 'secondary', published: 'success', closed: 'destructive' }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard ya Mwalimu</h1>
          <p className="text-gray-500 text-sm arabic-text">لوحة تحكم المعلم</p>
        </div>
        <Link href="/teacher/exams/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Mtihani Mpya
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Wanafunzi Wangu', arabicLabel: 'طلابي', value: totalStudents ?? 0, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Mitihani Yote', arabicLabel: 'جميع الامتحانات', value: totalExams ?? 0, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Mitihani Iliyochapishwa', arabicLabel: 'الامتحانات المنشورة', value: publishedExams ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, arabicLabel, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-600">{label}</p>
              <p className="text-xs text-gray-400 arabic-text">{arabicLabel}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Exams */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Mitihani ya Hivi Karibuni</CardTitle>
            <Link href="/teacher/exams" className="text-blue-600 text-sm hover:underline">Angalia Yote</Link>
          </CardHeader>
          <CardContent>
            {!recentExams?.length ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm mb-3">Hujatengeneza mtihani bado</p>
                <Link href="/teacher/exams/new" className="text-blue-600 text-sm hover:underline">Tengeneza mtihani wa kwanza</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {((recentExams ?? []) as unknown as RecentExam[]).map((exam) => (
                  <Link key={exam.id} href={`/teacher/exams/${exam.id}/edit`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900 text-sm arabic-text">{exam.title}</p>
                      <p className="text-xs text-gray-500">{formatDuration(exam.duration_minutes)} • Alama {exam.total_marks}</p>
                    </div>
                    <Badge variant={statusVariant[exam.status]}>{statusLabel[exam.status]}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Matokeo ya Hivi Karibuni</CardTitle>
            <Link href="/teacher/results" className="text-blue-600 text-sm hover:underline">Angalia Yote</Link>
          </CardHeader>
          <CardContent>
            {!recentAttempts?.length ? (
              <p className="text-gray-400 text-sm text-center py-6">Hakuna matokeo bado</p>
            ) : (
              <div className="space-y-3">
                {((recentAttempts ?? []) as unknown as RecentAttempt[]).map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{a.profiles?.full_name}</p>
                      <p className="text-xs text-gray-500 arabic-text">{a.exams?.title}</p>
                    </div>
                    <p className="font-bold text-gray-900">
                      {a.percentage != null ? `${a.percentage}%` : '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
