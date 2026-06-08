'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Check, PenLine, Trophy } from 'lucide-react'
import { getGrade } from '@/lib/utils'

interface AnswerRow {
  id: string
  question_id: string
  selected_option_id: string | null
  open_answer: string | null
  marks_awarded: number | null
  is_correct: boolean | null
  question: {
    id: string
    text: string
    type: string
    marks: number
    explanation: string | null
    options: { id: string; text: string; is_correct: boolean; order_index: number }[]
  }
  selected_option: { id: string; text: string } | null
}

interface AttemptDetail {
  id: string
  exam_id: string
  student_id: string
  score: number | null
  percentage: number | null
  status: string
  submitted_at: string | null
  profiles: { full_name: string; email: string } | null
  exams: { id: string; title: string; total_marks: number; teacher_id: string } | null
}

export default function TeacherGradingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null)
  const [answers, setAnswers] = useState<AnswerRow[]>([])
  const [openMarks, setOpenMarks] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: att } = await supabase
      .from('exam_attempts')
      .select('id, exam_id, student_id, score, percentage, status, submitted_at, profiles!student_id(full_name, email), exams!exam_id(id, title, total_marks, teacher_id)')
      .eq('id', id)
      .single()

    if (!att || (att as unknown as AttemptDetail).exams?.teacher_id !== user?.id) {
      router.push('/teacher/results')
      return
    }
    setAttempt(att as unknown as AttemptDetail)

    const { data: ans } = await supabase
      .from('student_answers')
      .select('id, question_id, selected_option_id, open_answer, marks_awarded, is_correct, questions!question_id(id, text, type, marks, explanation, options(*)), options!selected_option_id(id, text)')
      .eq('attempt_id', id)

    if (ans) {
      setAnswers(ans as unknown as AnswerRow[])
      const marks: Record<string, string> = {}
      for (const a of ans as unknown as AnswerRow[]) {
        if (a.question?.type === 'open') {
          marks[a.id] = a.marks_awarded != null ? String(a.marks_awarded) : ''
        }
      }
      setOpenMarks(marks)
    }
  }, [id, router])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  async function saveGrades() {
    setSaving(true)
    const supabase = createClient()

    const openAnswers = answers.filter((a) => a.question?.type === 'open')
    for (const a of openAnswers) {
      const marks = parseFloat(openMarks[a.id] ?? '')
      if (!isNaN(marks)) {
        await supabase
          .from('student_answers')
          .update({ marks_awarded: marks })
          .eq('id', a.id)
      }
    }

    // Check if all open answers now have marks
    const allGraded = openAnswers.every((a) => {
      const m = parseFloat(openMarks[a.id] ?? '')
      return !isNaN(m)
    })

    if (allGraded) {
      // Call finalize RPC
      const { error } = await supabase.rpc('finalize_open_grading', { p_attempt_id: id })
      if (error) {
        if (error.message.includes('open_answers_incomplete')) {
          setMessage('⚠️ Baadhi ya majibu bado hayana alama.')
        } else {
          setMessage('❌ Hitilafu: ' + error.message)
        }
      } else {
        setMessage('✅ Grading imekamilika. Matokeo yamehesabiwa.')
        load()
      }
    } else {
      setMessage('✅ Alama zimehifadhiwa. Jaza alama zote ili kukamilisha.')
    }

    setSaving(false)
    setTimeout(() => setMessage(''), 4000)
  }

  if (!attempt) return <div className="p-6 text-center text-gray-400">Inapakia...</div>

  const isFullyGraded = attempt.status === 'graded'
  const grade = attempt.percentage != null ? getGrade(attempt.percentage) : null
  const openAnswers = answers.filter((a) => a.question?.type === 'open')
  const hasOpen = openAnswers.length > 0
  const allOpenFilled = openAnswers.every((a) => openMarks[a.id]?.trim())

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 arabic-text">{attempt.exams?.title}</p>
          <h1 className="text-xl font-bold text-gray-900">{attempt.profiles?.full_name}</h1>
          <p className="text-gray-400 text-sm">{attempt.profiles?.email}</p>
        </div>
        <div className="text-right">
          {isFullyGraded && attempt.percentage != null ? (
            <>
              <p className="text-3xl font-bold">{attempt.percentage}%</p>
              {grade && <p className={`font-semibold ${grade.color}`}>{grade.grade} — {grade.label}</p>}
            </>
          ) : (
            <Badge variant="warning" className="flex items-center gap-1">
              <PenLine className="w-3 h-3" /> Inahitaji Grading
            </Badge>
          )}
        </div>
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
          {message}
        </div>
      )}

      {/* Answers */}
      <div className="space-y-4">
        {answers.map((a, i) => {
          const q = a.question
          const isOpen = q?.type === 'open'

          return (
            <Card key={a.id} className={`border-2 ${
              a.is_correct === true ? 'border-green-200' :
              a.is_correct === false ? 'border-red-200' :
              'border-gray-200'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">
                      {isOpen ? 'إجابة حرة' : 'اختيار من متعدد'} — الدرجة الكاملة: {q?.marks}
                    </p>
                    <p className="text-gray-900 arabic-text mb-3">{q?.text}</p>

                    {isOpen ? (
                      <div className="space-y-3">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs text-blue-600 mb-1">إجابة الطالب:</p>
                          <p className="text-gray-800 arabic-text">{a.open_answer ?? '(لم يجب)'}</p>
                        </div>
                        {q?.explanation && (
                          <div className="bg-green-50 rounded-lg p-3">
                            <p className="text-xs text-green-600 mb-1">الإجابة النموذجية:</p>
                            <p className="text-gray-800 arabic-text">{q.explanation}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            الدرجة (من {q?.marks}):
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max={q?.marks}
                            step="0.5"
                            value={openMarks[a.id] ?? ''}
                            onChange={(e) => setOpenMarks((prev) => ({ ...prev, [a.id]: e.target.value }))}
                            className="w-24"
                            disabled={isFullyGraded}
                            dir="ltr"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {(q?.options ?? [])
                          .sort((x, y) => x.order_index - y.order_index)
                          .map((opt) => {
                            const isSelected = a.selected_option_id === opt.id
                            return (
                              <div key={opt.id} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                                opt.is_correct ? 'bg-green-50 border border-green-200' :
                                isSelected ? 'bg-red-50 border border-red-200' :
                                'bg-gray-50'
                              }`}>
                                {opt.is_correct
                                  ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                  : <div className="w-3.5 h-3.5 shrink-0" />}
                                <span className="arabic-text">{opt.text}</span>
                                {isSelected && (
                                  <Badge variant="outline" className="text-xs mr-auto">إجابة الطالب</Badge>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {hasOpen && !isFullyGraded && (
        <div className="flex gap-3 justify-end">
          <Button
            onClick={saveGrades}
            loading={saving}
            disabled={!allOpenFilled}
          >
            <Trophy className="w-4 h-4" />
            {allOpenFilled ? 'Kamilisha Grading' : 'Jaza Alama Zote Kwanza'}
          </Button>
        </div>
      )}
    </div>
  )
}
