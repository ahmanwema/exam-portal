import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, getGrade } from '@/lib/utils'
import Link from 'next/link'
import { Trophy, Clock, PenLine } from 'lucide-react'
import type { AttemptStatus } from '@/types'

interface AttemptRow {
  id: string
  exam_id: string
  status: AttemptStatus
  score: number | null
  percentage: number | null
  submitted_at: string | null
  exams: {
    id: string
    title: string
    total_marks: number
    show_results: boolean
    show_answers: boolean
  } | null
}

export default async function StudentResultsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('exam_attempts')
    .select('id, exam_id, status, score, percentage, submitted_at, exams!exam_id(id, title, total_marks, show_results, show_answers)')
    .eq('student_id', user!.id)
    .in('status', ['submitted', 'graded'])
    .order('submitted_at', { ascending: false })

  const attempts = (data ?? []) as unknown as AttemptRow[]

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Matokeo Yangu</h1>
        <p className="text-gray-500 text-sm arabic-text">نتائجي</p>
      </div>

      {!attempts.length ? (
        <div className="text-center py-20">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Hujafanya mtihani wowote bado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {attempts.map((a) => {
            const exam = a.exams
            const isGraded = a.status === 'graded'
            const hasPendingOpen = a.status === 'submitted' && a.percentage === null
            const grade = a.percentage != null ? getGrade(a.percentage) : null
            const showResult = exam?.show_results && isGraded

            return (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 arabic-text">{exam?.title}</p>
                      <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {a.submitted_at ? formatDate(a.submitted_at) : '—'}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      {hasPendingOpen ? (
                        // submitted but open answers not yet graded by teacher
                        <Badge variant="warning" className="flex items-center gap-1">
                          <PenLine className="w-3 h-3" />
                          Inasubiri Grading ya Mwalimu
                        </Badge>
                      ) : showResult && a.percentage != null ? (
                        <div className="text-center">
                          <p className="text-3xl font-bold text-gray-900">{a.percentage}%</p>
                          <p className="text-sm font-medium text-gray-600">
                            {a.score}/{exam?.total_marks} alama
                          </p>
                          {grade && (
                            <p className={`text-sm font-bold ${grade.color}`}>
                              {grade.grade} — {grade.label}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">Matokeo Yanasubiri</Badge>
                      )}
                    </div>
                  </div>

                  {showResult && (
                    <Link
                      href={`/student/results/${a.exam_id}`}
                      className="mt-3 inline-block text-blue-600 text-sm hover:underline"
                    >
                      Angalia Majibu →
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
