import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, getGrade } from '@/lib/utils'

export default async function AdminReportsPage() {
  const supabase = await createClient()

  const { data: attempts } = await supabase
    .from('exam_attempts')
    .select(`
      id, started_at, submitted_at, score, percentage, status,
      profiles!student_id(full_name, email),
      exams!exam_id(title, total_marks, teacher_id, profiles!teacher_id(full_name))
    `)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ripoti za Mitihani</h1>
        <p className="text-gray-500 text-sm arabic-text">تقارير الامتحانات</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matokeo Yote ({attempts?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!attempts?.length ? (
            <p className="text-gray-400 text-sm text-center py-8">Hakuna matokeo bado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-2 text-gray-600 font-medium">Mwanafunzi</th>
                    <th className="text-right py-3 px-2 text-gray-600 font-medium">Mtihani</th>
                    <th className="text-right py-3 px-2 text-gray-600 font-medium">Mwalimu</th>
                    <th className="text-right py-3 px-2 text-gray-600 font-medium">Alama</th>
                    <th className="text-right py-3 px-2 text-gray-600 font-medium">Asilimia</th>
                    <th className="text-right py-3 px-2 text-gray-600 font-medium">Daraja</th>
                    <th className="text-right py-3 px-2 text-gray-600 font-medium">Tarehe</th>
                  </tr>
                </thead>
                <tbody>
                  {(attempts as unknown as Array<{
                    id: string
                    submitted_at: string | null
                    score: number | null
                    percentage: number | null
                    profiles: { full_name: string; email: string } | null
                    exams: { title: string; total_marks: number; profiles: { full_name: string } | null } | null
                  }>).map((a) => {
                    const grade = a.percentage != null ? getGrade(a.percentage) : null
                    return (
                      <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <p className="font-medium">{a.profiles?.full_name}</p>
                          <p className="text-gray-400 text-xs">{a.profiles?.email}</p>
                        </td>
                        <td className="py-3 px-2 arabic-text text-sm">{a.exams?.title}</td>
                        <td className="py-3 px-2 text-gray-600">{a.exams?.profiles?.full_name}</td>
                        <td className="py-3 px-2 font-medium">
                          {a.score != null ? `${a.score}/${a.exams?.total_marks}` : '—'}
                        </td>
                        <td className="py-3 px-2 font-bold">
                          {a.percentage != null ? `${a.percentage}%` : '—'}
                        </td>
                        <td className="py-3 px-2">
                          {grade && (
                            <Badge variant={grade.grade === 'F' ? 'destructive' : grade.grade === 'A' ? 'success' : 'default'}>
                              {grade.grade} — {grade.label}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 text-gray-500 text-xs">
                          {a.submitted_at ? formatDate(a.submitted_at) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
