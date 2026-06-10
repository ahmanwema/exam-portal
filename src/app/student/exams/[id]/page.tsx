'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Clock, Send, AlertTriangle, CheckCircle } from 'lucide-react'
import { getTimeRemaining } from '@/lib/utils'
import type { StudentExam, StudentQuestion, ExamAttempt, SubmitExamResult } from '@/types'

type AnswerMap = Record<string, { optionId?: string; openAnswer?: string }>

export default function ExamTakingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [exam, setExam] = useState<StudentExam | null>(null)
  const [questions, setQuestions] = useState<StudentQuestion[]>([])
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof getTimeRemaining> | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const saveTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  // Keep a ref to answers so auto-submit timer always sees the latest answers
  const answersRef = useRef<AnswerMap>({})

  const loadExam = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Use RPC — returns exam data WITHOUT is_correct on options
    const { data, error: rpcError } = await supabase.rpc('get_exam_for_student', {
      p_exam_id: id,
    })

    if (rpcError || !data) {
      router.push('/student/dashboard')
      return
    }

    const examData = data as StudentExam

    // Check for existing attempt
    const { data: existingAttempt } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', id)
      .eq('student_id', user.id)
      .single()

    if (existingAttempt?.status === 'submitted' || existingAttempt?.status === 'graded') {
      router.push(`/student/results/${id}`)
      return
    }

    // Order questions
    let orderedQuestions = [...examData.questions]
    if (examData.randomize_questions && existingAttempt?.question_order) {
      const order = existingAttempt.question_order as string[]
      orderedQuestions = order
        .map((qid) => orderedQuestions.find((q) => q.id === qid))
        .filter((q): q is StudentQuestion => q !== undefined)
    } else if (examData.randomize_questions && !existingAttempt) {
      orderedQuestions = orderedQuestions.sort(() => Math.random() - 0.5)
    } else {
      orderedQuestions = orderedQuestions.sort((a, b) => a.order_index - b.order_index)
    }

    setExam(examData)
    setQuestions(orderedQuestions)

    if (existingAttempt) {
      setAttempt(existingAttempt as ExamAttempt)
      const { data: savedAnswers } = await supabase
        .from('student_answers')
        .select('question_id, selected_option_id, open_answer')
        .eq('attempt_id', existingAttempt.id)

      if (savedAnswers) {
        const aMap: AnswerMap = {}
        for (const a of savedAnswers) {
          aMap[a.question_id] = {
            optionId: a.selected_option_id ?? undefined,
            openAnswer: a.open_answer ?? undefined,
          }
        }
        answersRef.current = aMap
        setAnswers(aMap)
      }
      setStarted(true)
    }
    setLoading(false)
  }, [id, router])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadExam() }, [loadExam])

  // Countdown timer
  useEffect(() => {
    if (!attempt || !exam || !started) return
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(attempt.started_at, exam.duration_minutes)
      setTimeLeft(remaining)
      if (remaining.expired) {
        clearInterval(interval)
        void handleSubmit()
      }
    }, 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, exam, started])

  // Auto-save answers every 30 seconds
  useEffect(() => {
    if (!attempt) return
    saveTimerRef.current = setInterval(() => saveCurrentAnswer(), 30_000)
    return () => clearInterval(saveTimerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, answers, currentQ])

  async function startExam() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: newAttempt, error: insertError } = await supabase
      .from('exam_attempts')
      .insert({
        exam_id: id,
        student_id: user.id,
        status: 'in_progress',
        question_order: questions.map((q) => q.id),
      })
      .select()
      .single()

    if (insertError) {
      setError('Hitilafu ya kuanza mtihani. Hakikisha umepewa mtihani huu.')
      return
    }
    setAttempt(newAttempt as ExamAttempt)
    setStarted(true)
  }

  async function saveCurrentAnswer() {
    if (!attempt) return
    const q = questions[currentQ]
    const ans = answersRef.current[q.id]
    if (!ans) return
    const supabase = createClient()
    const { error: saveErr } = await supabase.from('student_answers').upsert(
      {
        attempt_id: attempt.id,
        question_id: q.id,
        selected_option_id: ans.optionId ?? null,
        open_answer: ans.openAnswer ?? null,
      },
      { onConflict: 'attempt_id,question_id' }
    )
    if (saveErr) console.error('Auto-save failed:', saveErr)
  }

  function selectOption(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: { optionId } }
      answersRef.current = next
      return next
    })
  }

  function setOpenAnswer(questionId: string, text: string) {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: { openAnswer: text } }
      answersRef.current = next
      return next
    })
  }

  async function handleSubmit() {
    if (submitting || submitted || !attempt) return
    setSubmitting(true)
    setError('')

    const supabase = createClient()

    // Use ref so timer-triggered auto-submit always has the latest answers
    const latestAnswers = answersRef.current
    const upserts = questions.map((q) => {
      const ans = latestAnswers[q.id]
      return {
        attempt_id: attempt.id,
        question_id: q.id,
        selected_option_id: ans?.optionId ?? null,
        open_answer: ans?.openAnswer ?? null,
      }
    })
    const { error: upsertError } = await supabase
      .from('student_answers')
      .upsert(upserts, { onConflict: 'attempt_id,question_id' })

    if (upsertError) {
      console.error('Answer save failed before submit:', upsertError)
      setError('Hitilafu ya kuhifadhi majibu. Jaribu tena.')
      setSubmitting(false)
      return
    }

    // Call server-side grading RPC
    const { data: result, error: submitError } = await supabase.rpc('submit_exam', {
      p_attempt_id: attempt.id,
    })

    if (submitError) {
      const msg = submitError.message
      if (msg.includes('time_expired')) {
        setError('Muda wa mtihani umeisha. Majibu yako yamehifadhiwa.')
      } else {
        setError('Hitilafu ya kuwasilisha. Jaribu tena.')
      }
      setSubmitting(false)
      return
    }

    const res = result as SubmitExamResult
    void res
    setSubmitted(true)
    setSubmitting(false)
    setTimeout(() => router.push(`/student/results/${id}`), 2000)
  }

  // ── Derived state ──────────────────────────────────────────
  const answeredCount = questions.filter((q) => {
    const ans = answers[q.id]
    return ans?.optionId || (ans?.openAnswer?.trim())
  }).length

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Inapakia mtihani...</p>
      </div>
    )
  }

  // ── Submitted confirmation ─────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Mtihani Umewasilishwa!</h2>
          <p className="text-gray-500 mt-2 arabic-text">تم تسليم الامتحان بنجاح</p>
          <p className="text-gray-400 text-sm mt-4">Unelekeza kwenye matokeo...</p>
        </div>
      </div>
    )
  }

  // ── Start screen ───────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text mb-2">{exam?.title}</h1>
          {exam?.description && (
            <p className="text-gray-500 text-sm arabic-text mb-4">{exam.description}</p>
          )}

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xl font-bold text-gray-900">{exam?.duration_minutes}</p>
              <p className="text-xs text-gray-500">Dakika</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xl font-bold text-gray-900">{questions.length}</p>
              <p className="text-xs text-gray-500">Maswali</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xl font-bold text-gray-900">{exam?.total_marks}</p>
              <p className="text-xs text-gray-500">Alama</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-right">
            <p className="text-amber-800 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Muda utaanza mara tu utakapobonyeza &ldquo;Anza Mtihani&rdquo;. Usitoke ukurasa huu kabla ya kumaliza.
            </p>
          </div>

          <Button onClick={startExam} size="lg" className="w-full">
            Anza Mtihani — ابدأ الامتحان
          </Button>
        </div>
      </div>
    )
  }

  // ── Exam in progress ───────────────────────────────────────
  const q = questions[currentQ]
  const timerDanger = timeLeft !== null && timeLeft.minutes < 5
  const timerWarning = timeLeft !== null && timeLeft.minutes < 15 && !timerDanger

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm arabic-text line-clamp-1">{exam?.title}</p>
            <p className="text-xs text-gray-500">{answeredCount}/{questions.length} amejibiwa</p>
          </div>
          <div className={`flex items-center gap-2 font-mono text-lg font-bold px-4 py-1.5 rounded-full ${
            timerDanger  ? 'bg-red-100 text-red-600 animate-pulse' :
            timerWarning ? 'bg-amber-100 text-amber-600' :
            'bg-blue-50 text-blue-700'
          }`}>
            <Clock className="w-4 h-4" />
            {timeLeft
              ? `${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`
              : '--:--'}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-blue-600 transition-all"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 flex gap-6">
        {/* Question card */}
        <div className="flex-1 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {currentQ + 1}
              </span>
              <div>
                <Badge variant="outline" className="text-xs">
                  {q.type === 'mcq' ? 'اختيار من متعدد' : 'إجابة حرة'}
                </Badge>
                <span className="text-xs text-gray-400 mr-2">— الدرجة: {q.marks}</span>
              </div>
            </div>
            <p className="text-lg text-gray-900 arabic-text leading-relaxed mb-6">{q.text}</p>

            {q.type === 'mcq' ? (
              <div className="space-y-3">
                {q.options.map((opt) => {
                  const isSelected = answers[q.id]?.optionId === opt.id
                  return (
                    <button
                      key={opt.id}
                      onClick={() => selectOption(q.id, opt.id)}
                      className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                        <span className="arabic-text text-gray-900">{opt.text}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <Textarea
                value={answers[q.id]?.openAnswer ?? ''}
                onChange={(e) => setOpenAnswer(q.id, e.target.value)}
                placeholder="اكتب إجابتك هنا..."
                className="arabic-text min-h-32 text-base"
                rows={6}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
              disabled={currentQ === 0}
            >
              السابق ←
            </Button>
            {currentQ < questions.length - 1 ? (
              <Button
                onClick={async () => {
                  await saveCurrentAnswer()
                  setCurrentQ((p) => p + 1)
                }}
              >
                → التالي
              </Button>
            ) : (
              <Button variant="success" onClick={() => handleSubmit()} loading={submitting}>
                <Send className="w-4 h-4" /> سلّم الامتحان
              </Button>
            )}
          </div>
        </div>

        {/* Question navigator (desktop) */}
        <div className="hidden lg:block w-48">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-20">
            <p className="text-xs font-medium text-gray-500 mb-3">لوحة الأسئلة</p>
            <div className="grid grid-cols-4 gap-1.5">
              {questions.map((qItem, i) => {
                const ans = answers[qItem.id]
                const answered = ans?.optionId || ans?.openAnswer?.trim()
                return (
                  <button
                    key={qItem.id}
                    onClick={() => setCurrentQ(i)}
                    className={`w-full aspect-square rounded-lg text-xs font-medium transition-colors ${
                      i === currentQ   ? 'bg-blue-600 text-white' :
                      answered        ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 bg-green-100 rounded" /> amejibiwa
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 bg-gray-100 rounded" /> hajajibu
              </div>
            </div>
            <Button
              className="w-full mt-4"
              size="sm"
              variant="success"
              onClick={() => handleSubmit()}
              loading={submitting}
            >
              سلّم
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
