import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Clock, Users } from 'lucide-react'
import { formatDate, formatDuration } from '@/lib/utils'
import type { ExamStatus } from '@/types'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'

interface ExamRow {
  id: string
  title: string
  status: ExamStatus
  duration_minutes: number
  total_marks: number
  created_at: string
  profiles: { full_name: string } | null
}

export default async function AdminExamsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('exams')
    .select('id, title, status, duration_minutes, total_marks, created_at, profiles!teacher_id(full_name)')
    .order('created_at', { ascending: false })

  const exams = (data ?? []) as unknown as ExamRow[]

  const statusLabel: Record<ExamStatus, string> = {
    draft: 'Rasimu', published: 'Imechapishwa', closed: 'Imefungwa',
  }
  const statusVariant: Record<ExamStatus, BadgeVariant> = {
    draft: 'secondary', published: 'success', closed: 'destructive',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mitihani Yote</h1>
        <p className="text-gray-500 text-sm arabic-text">جميع الامتحانات ({exams.length})</p>
      </div>

      {!exams.length ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Hakuna mitihani bado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => (
            <Card key={exam.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={statusVariant[exam.status]}>{statusLabel[exam.status]}</Badge>
                  <span className="text-xs text-gray-400">{formatDate(exam.created_at)}</span>
                </div>
                <h3 className="font-semibold text-gray-900 arabic-text mb-1">{exam.title}</h3>
                <p className="text-sm text-gray-500 mb-2">Mwalimu: {exam.profiles?.full_name}</p>
                <div className="flex gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{formatDuration(exam.duration_minutes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />Alama {exam.total_marks}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
