import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, getGrade } from '@/lib/utils'
import Link from 'next/link'
import { PenLine } from 'lucide-react'

interface AttemptRow {
  id: string
  submitted_at: string | null
  score: number | null
  percentage: number | null
  status: string
  profiles: { full_name: string; email: string } | null
  exams: { id: string; title: string; total_marks: number; teacher_id: string } | null
}

export default async function TeacherResultsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('exam_attempts')
    .select(`
      id, submitted_at, score, percentage, status,
      profiles!student_id(full_name, email),
      exams!exam_id(id, title, total_marks, teacher_id)
    `)
    .eq('exams.teacher_id', user!.id)
    .in('status', ['submitted', 'graded'])
    .order('submitted_at', { ascending: false })

  const attempts = (data ?? []) as unknown as AttemptRow[]
  const needsGrading = attempts.filter((a) => a.status === 'submitted' && a.percentage === null)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Matokeo ya Wanafunzi</h1>
        <p className="text-gray-500 text-sm arabic-text">نتائج الطلاب</p>
      </div>

      {needsGrading.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <PenLine className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-amber-800 text-sm">
            <strong>{needsGrading.length}</strong> mtihani una majibu ya wazi yanayohitaji grading yako.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Majibu Yaliyowasilishwa ({attempts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!attempts.length ? (
            <p className="text-gray-400 text-sm text-center py-8">Hakuna matokeo bado</p>
          ) : (
            <div className="space-y-3">
              {attempts.map((a) => {
                const hasPendingOpen = a.status === 'submitted' && a.percentage === null
                const grade = a.percentage != null ? getGrade(a.percentage) : null

                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{a.profiles?.full_name}</p>
                      <p className="text-sm text-gray-500 arabic-text">{a.exams?.title}</p>
                      <p className="text-xs text-gray-400">
                        {a.submitted_at ? formatDate(a.submitted_at) : '—'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {hasPendingOpen ? (
                          <Badge variant="warning" className="flex items-center gap-1">
                            <PenLine className="w-3 h-3" /> Inahitaji Grading
                          </Badge>
                        ) : a.percentage != null ? (
                          <>
                            <p className="font-bold text-lg text-gray-900">
                              {a.score}/{a.exams?.total_marks}
                            </p>
                            {grade && (
                              <p className={`text-sm font-medium ${grade.color}`}>
                                {grade.grade} — {grade.label}
                              </p>
                            )}
                          </>
                        ) : (
                          <Badge variant="secondary">MCQ Peke Yake</Badge>
                        )}
                      </div>
                      <Link
                        href={`/teacher/results/${a.id}`}
                        className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700"
                      >
                        {hasPendingOpen ? 'Grade' : 'Angalia'}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
