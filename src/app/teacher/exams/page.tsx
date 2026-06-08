import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, Clock, BookOpen, Users } from 'lucide-react'
import { formatDate, formatDuration } from '@/lib/utils'
import type { ExamStatus } from '@/types'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'

interface ExamRow {
  id: string
  title: string
  description: string | null
  status: ExamStatus
  duration_minutes: number
  total_marks: number
  created_at: string
  questions: Array<{ count: number }>
  exam_attempts: Array<{ count: number }>
}

export default async function TeacherExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('exams')
    .select('id, title, description, status, duration_minutes, total_marks, created_at, questions(count), exam_attempts(count)')
    .eq('teacher_id', user!.id)
    .order('created_at', { ascending: false })

  const exams = (data ?? []) as unknown as ExamRow[]
  const statusLabel: Record<ExamStatus, string> = { draft: 'Rasimu', published: 'Imechapishwa', closed: 'Imefungwa' }
  const statusVariant: Record<ExamStatus, BadgeVariant> = { draft: 'secondary', published: 'success', closed: 'destructive' }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mitihani Yangu</h1>
          <p className="text-gray-500 text-sm arabic-text">امتحاناتي</p>
        </div>
        <Link href="/teacher/exams/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Mtihani Mpya
        </Link>
      </div>

      {!exams.length ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Hujatengeneza mtihani bado</p>
          <Link href="/teacher/exams/new" className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700">
            Tengeneza Mtihani wa Kwanza
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={statusVariant[exam.status]}>{statusLabel[exam.status]}</Badge>
                  <span className="text-xs text-gray-400">{formatDate(exam.created_at)}</span>
                </div>
                <h3 className="font-semibold text-gray-900 arabic-text mb-1">{exam.title}</h3>
                {exam.description && (
                  <p className="text-sm text-gray-500 arabic-text mb-3 line-clamp-2">{exam.description}</p>
                )}
                <div className="flex gap-4 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(exam.duration_minutes)}</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{exam.questions?.[0]?.count ?? 0} maswali</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{exam.exam_attempts?.[0]?.count ?? 0} majaribio</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/teacher/exams/${exam.id}/edit`} className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 rounded-lg transition-colors">
                    Hariri
                  </Link>
                  <Link href={`/teacher/results?exam=${exam.id}`} className="flex-1 text-center bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm py-2 rounded-lg transition-colors">
                    Matokeo
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
