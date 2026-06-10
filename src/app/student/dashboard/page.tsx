import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatDuration } from '@/lib/utils'
import type { ExamStatus } from '@/types'

interface ExamRow {
  id: string
  title: string
  duration_minutes: number
  total_marks: number
  status: ExamStatus
  start_time: string | null
  end_time: string | null
}

interface AttemptRow {
  exam_id: string
  status: string
  score: number | null
  percentage: number | null
  submitted_at: string | null
}

function getCurrentTimestamp() {
  return Date.now()
}

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user!.id).single()

  const [{ data: assignments }, { data: rawAttempts }] = await Promise.all([
    supabase
      .from('exam_assignments')
      .select('exam_id, exams!exam_id(id, title, duration_minutes, total_marks, status, start_time, end_time)')
      .eq('student_id', user!.id),
    supabase
      .from('exam_attempts')
      .select('exam_id, status, score, percentage, submitted_at')
      .eq('student_id', user!.id),
  ])

  const attempts = (rawAttempts ?? []) as AttemptRow[]
  const attemptMap = new Map(attempts.map((a) => [a.exam_id, a]))

  const exams: ExamRow[] = (assignments ?? [])
    .map((a) => (a as unknown as { exams: ExamRow | null }).exams)
    .filter((e): e is ExamRow => e !== null)

  const now = getCurrentTimestamp()
  const isWithinExamWindow = (exam: ExamRow) => {
    const startsOk = !exam.start_time || new Date(exam.start_time).getTime() <= now
    const endsOk = !exam.end_time || new Date(exam.end_time).getTime() >= now
    return startsOk && endsOk
  }

  const availableExams = exams.filter((e) => e.status === 'published' && !attemptMap.has(e.id) && isWithinExamWindow(e))
  const unavailableExams = exams.filter((e) => e.status === 'published' && !attemptMap.has(e.id) && !isWithinExamWindow(e))
  const completedExams = exams.filter((e) => attemptMap.has(e.id))

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          مرحباً، {profile?.full_name}
        </h1>
        <p className="text-gray-500 text-sm">Karibu kwenye Exam Portal yako</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Mitihani Inayosubiri', value: availableExams.length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Mitihani Iliyofanywa', value: completedExams.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Mitihani Yote', value: exams.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-600">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Exams */}
      {availableExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Mitihani Inayosubiri — الامتحانات المتاحة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableExams.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-900 arabic-text">{exam.title}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />{formatDuration(exam.duration_minutes)}
                    </span>
                    <span>Alama {exam.total_marks}</span>
                  </p>
                </div>
                <Link href={`/student/exams/${exam.id}`} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Fanya Mtihani
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {unavailableExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mitihani Iliyopangwa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unavailableExams.map((exam) => {
              const hasNotStarted = exam.start_time && new Date(exam.start_time).getTime() > now
              return (
                <div key={exam.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-900 arabic-text">{exam.title}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />{formatDuration(exam.duration_minutes)}
                      </span>
                      <span>Alama {exam.total_marks}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {hasNotStarted && exam.start_time
                        ? `Utaanza ${formatDate(exam.start_time)}`
                        : exam.end_time
                          ? `Umefungwa ${formatDate(exam.end_time)}`
                          : 'Haupatikani sasa'}
                    </p>
                  </div>
                  <Badge variant="secondary">{hasNotStarted ? 'Bado' : 'Umefungwa'}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Completed Exams */}
      {completedExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mitihani Iliyokamilika</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedExams.map((exam) => {
              const attempt = attemptMap.get(exam.id)
              return (
                <div key={exam.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 arabic-text">{exam.title}</p>
                    <p className="text-xs text-gray-400">
                      {attempt?.submitted_at ? formatDate(attempt.submitted_at) : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {attempt?.percentage != null ? (
                      <>
                        <p className="font-bold text-gray-900">{attempt.percentage}%</p>
                        <Link href={`/student/results/${exam.id}`} className="text-blue-600 text-sm hover:underline">
                          Angalia
                        </Link>
                      </>
                    ) : (
                      <Badge variant="secondary">Inasubiri Matokeo</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {exams.length === 0 && (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Huna mitihani iliyopewa bado.</p>
          <p className="text-gray-400 text-sm mt-1">Mwalimu wako ataijumuisha mtihani hivi karibuni.</p>
        </div>
      )}
    </div>
  )
}
