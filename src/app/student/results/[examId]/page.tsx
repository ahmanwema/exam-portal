import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X, Minus, Trophy } from 'lucide-react'
import { formatDate, getGrade } from '@/lib/utils'

interface OptionRow { id: string; text: string; is_correct: boolean; order_index: number }
interface QuestionRow {
  id: string; text: string; type: string; marks: number
  explanation: string | null; options: OptionRow[]
}
interface AnswerRow {
  id: string
  selected_option_id: string | null
  open_answer: string | null
  marks_awarded: number | null
  is_correct: boolean | null
  questions: QuestionRow | null
  options: { id: string; text: string } | null
}

export default async function StudentResultDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { examId } = await params

  const { data: attempt } = await supabase
    .from('exam_attempts')
    .select('id, score, percentage, submitted_at, exams!exam_id(id, title, total_marks, show_results, show_answers, pass_marks)')
    .eq('exam_id', examId)
    .eq('student_id', user!.id)
    .single()

  if (!attempt) redirect('/student/results')

  const exam = (attempt as unknown as { exams: { id: string; title: string; total_marks: number; show_results: boolean; show_answers: boolean; pass_marks: number | null } | null }).exams

  if (!exam?.show_results) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500">Matokeo bado hayajaonyeshwa na mwalimu.</p>
      </div>
    )
  }

  const { data } = await supabase
    .from('student_answers')
    .select('id, selected_option_id, open_answer, marks_awarded, is_correct, questions!question_id(id, text, type, marks, explanation, options(*)), options!selected_option_id(id, text)')
    .eq('attempt_id', attempt.id)

  const answers = (data ?? []) as unknown as AnswerRow[]

  const score = (attempt as { score: number | null }).score
  const percentage = (attempt as { percentage: number | null }).percentage
  const submittedAt = (attempt as { submitted_at: string | null }).submitted_at

  const grade = percentage != null ? getGrade(percentage) : null
  const passed = exam.pass_marks != null ? (score ?? 0) >= exam.pass_marks : null

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Result Summary */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm arabic-text">{exam.title}</p>
              <p className="text-3xl font-bold mt-1">{percentage}%</p>
              <p className="text-blue-200">{score}/{exam.total_marks} alama</p>
              {grade && <p className="text-xl font-semibold mt-2">{grade.grade} — {grade.label}</p>}
              {passed !== null && (
                <Badge variant={passed ? 'success' : 'destructive'} className="mt-2">
                  {passed ? '✅ Amefaulu' : '❌ Amefeli'}
                </Badge>
              )}
            </div>
            <Trophy className="w-16 h-16 text-blue-300 opacity-50" />
          </div>
          <p className="text-blue-300 text-xs mt-4">
            {submittedAt ? formatDate(submittedAt) : '—'}
          </p>
        </CardContent>
      </Card>

      {/* Answers Review */}
      {exam.show_answers && answers.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-gray-900 text-lg">مراجعة الإجابات</h2>
          {answers.map((ans, i) => {
            const q = ans.questions
            const isCorrect = ans.is_correct
            const isOpen = q?.type === 'open'

            return (
              <Card key={ans.id} className={`border-2 ${
                isCorrect === true ? 'border-green-300' :
                isCorrect === false ? 'border-red-300' :
                'border-gray-200'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isCorrect === true  ? 'bg-green-100 text-green-600' :
                      isCorrect === false ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {isCorrect === true  ? <Check className="w-4 h-4" /> :
                       isCorrect === false ? <X className="w-4 h-4" /> :
                       <Minus className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-500 text-xs mb-1">
                        سؤال {i + 1} — الدرجة: {ans.marks_awarded ?? '?'}/{q?.marks}
                      </p>
                      <p className="text-gray-900 arabic-text mb-3">{q?.text}</p>

                      {isOpen ? (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">إجابتك:</p>
                          <p className="text-gray-700 arabic-text">{ans.open_answer ?? '(لم تجب)'}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(q?.options ?? [])
                            .sort((a, b) => a.order_index - b.order_index)
                            .map((opt) => {
                              const isSelected = ans.selected_option_id === opt.id
                              const isCorrectOpt = opt.is_correct
                              return (
                                <div key={opt.id} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                                  isCorrectOpt ? 'bg-green-50 border border-green-200' :
                                  isSelected && !isCorrectOpt ? 'bg-red-50 border border-red-200' :
                                  'bg-gray-50'
                                }`}>
                                  {isCorrectOpt
                                    ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                    : <div className="w-3.5 h-3.5 shrink-0" />}
                                  <span className="arabic-text">{opt.text}</span>
                                  {isSelected && (
                                    <Badge variant="outline" className="text-xs mr-auto">إجابتك</Badge>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      )}

                      {q?.explanation && (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-blue-700 mb-1">الشرح:</p>
                          <p className="text-sm text-blue-800 arabic-text">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
