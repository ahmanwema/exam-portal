'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Check, X, Send, Users, ChevronDown, ChevronUp } from 'lucide-react'
import type { Exam, Option } from '@/types'

type QuestionDraft = {
  id?: string
  text: string
  type: 'mcq' | 'open'
  marks: number
  explanation: string
  options: { id?: string; text: string; is_correct: boolean }[]
  saved: boolean
  expanded: boolean
}

export default function ExamEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<QuestionDraft[]>([])
  interface StudentProfile { id: string; full_name: string; email: string }
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [assignedStudents, setAssignedStudents] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<'questions' | 'assign'>('questions')

  const loadExam = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: examData } = await supabase
      .from('exams').select('*').eq('id', id).eq('teacher_id', user!.id).single()
    if (!examData) { router.push('/teacher/exams'); return }
    setExam(examData as Exam)

    const { data: qData } = await supabase
      .from('questions').select('*, options(*)').eq('exam_id', id).order('order_index')

    if (qData) {
      setQuestions(qData.map((q) => {
        const typedQ = q as { id: string; text: string; type: 'mcq' | 'open'; marks: number; explanation: string | null; options: Option[] }
        return {
          id: typedQ.id, text: typedQ.text, type: typedQ.type, marks: typedQ.marks,
          explanation: typedQ.explanation ?? '',
          options: (typedQ.options ?? []).sort((a, b) => a.order_index - b.order_index).map((o) => ({
            id: o.id, text: o.text, is_correct: o.is_correct
          })),
          saved: true, expanded: false,
        }
      }))
    }

    const { data: myStudents } = await supabase
      .from('teacher_students')
      .select('student_id, profiles!student_id(id, full_name, email)')
      .eq('teacher_id', user!.id)
    setStudents(((myStudents ?? []) as unknown as Array<{ profiles: StudentProfile | null }>)
      .map((ts) => ts.profiles)
      .filter((p): p is StudentProfile => p !== null))

    const { data: assigned } = await supabase
      .from('exam_assignments').select('student_id').eq('exam_id', id)
    setAssignedStudents((assigned ?? []).map((a) => (a as { student_id: string }).student_id))
  }, [id, router])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadExam() }, [loadExam])

  function addQuestion() {
    setQuestions((prev) => [...prev, {
      text: '', type: 'mcq', marks: 1, explanation: '',
      options: [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ],
      saved: false, expanded: true,
    }])
  }

  function updateQuestion(index: number, field: string, value: string | number | boolean) {
    setQuestions((prev) => prev.map((q, i) => i === index ? { ...q, [field]: value, saved: false } : q))
  }

  function updateOption(qIndex: number, oIndex: number, field: string, value: string | boolean) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q
      const opts = q.options.map((o, j) => {
        if (j !== oIndex) return field === 'is_correct' && q.type === 'mcq' ? { ...o, is_correct: false } : o
        return { ...o, [field]: value }
      })
      return { ...q, options: opts, saved: false }
    }))
  }

  function addOption(qIndex: number) {
    setQuestions((prev) => prev.map((q, i) =>
      i === qIndex ? { ...q, options: [...q.options, { text: '', is_correct: false }], saved: false } : q
    ))
  }

  function removeOption(qIndex: number, oIndex: number) {
    setQuestions((prev) => prev.map((q, i) =>
      i === qIndex ? { ...q, options: q.options.filter((_, j) => j !== oIndex), saved: false } : q
    ))
  }

  async function saveQuestion(index: number) {
    const q = questions[index]
    if (!q.text.trim()) { setMessage('❌ Andika maandishi ya swali'); return }
    if (q.type === 'mcq') {
      if (q.options.some((o) => !o.text.trim())) { setMessage('❌ Jaza chaguo zote'); return }
      if (!q.options.some((o) => o.is_correct)) { setMessage('❌ Chagua jibu sahihi moja'); return }
    }
    setSaving(true)
    const supabase = createClient()

    if (q.id) {
      await supabase.from('questions').update({ text: q.text, type: q.type, marks: q.marks, explanation: q.explanation || null }).eq('id', q.id)
      if (q.type === 'mcq') {
        await supabase.from('options').delete().eq('question_id', q.id)
        await supabase.from('options').insert(q.options.map((o, j) => ({ question_id: q.id, text: o.text, is_correct: o.is_correct, order_index: j })))
      }
    } else {
      const totalQuestions = questions.filter((qu) => qu.id).length
      const { data: newQ } = await supabase.from('questions').insert({
        exam_id: id, text: q.text, type: q.type, marks: q.marks,
        explanation: q.explanation || null, order_index: totalQuestions,
      }).select().single()
      if (newQ && q.type === 'mcq') {
        await supabase.from('options').insert(q.options.map((o, j) => ({ question_id: newQ.id, text: o.text, is_correct: o.is_correct, order_index: j })))
      }
      if (newQ) setQuestions((prev) => prev.map((qu, i) => i === index ? { ...qu, id: newQ.id } : qu))
    }

    const totalMarks = questions.reduce((sum, qu, i) => sum + (i === index ? q.marks : qu.marks), 0)
    await supabase.from('exams').update({ total_marks: totalMarks }).eq('id', id)

    setQuestions((prev) => prev.map((qu, i) => i === index ? { ...qu, saved: true, expanded: false } : qu))
    setMessage('✅ Swali limehifadhiwa')
    setSaving(false)
    setTimeout(() => setMessage(''), 2000)
  }

  async function deleteQuestion(index: number) {
    const q = questions[index]
    const supabase = createClient()
    if (q.id) await supabase.from('questions').delete().eq('id', q.id)
    const remaining = questions.filter((_, i) => i !== index)
    setQuestions(remaining)
    const totalMarks = remaining.reduce((sum, qu) => sum + qu.marks, 0)
    await supabase.from('exams').update({ total_marks: totalMarks }).eq('id', id)
  }

  async function publishExam() {
    const savedQ = questions.filter((q) => q.id)
    if (savedQ.length === 0) { setMessage('❌ Lazima uwe na swali moja angalau kabla ya kuchapisha'); return }
    setPublishing(true)
    const supabase = createClient()
    await supabase.from('exams').update({ status: 'published' }).eq('id', id)
    setExam((prev) => prev ? { ...prev, status: 'published' } : prev)
    setMessage('✅ Mtihani umechapishwa!')
    setPublishing(false)
    setTimeout(() => setMessage(''), 3000)
  }

  async function toggleStudentAssignment(studentId: string) {
    const supabase = createClient()
    const isAssigned = assignedStudents.includes(studentId)
    if (isAssigned) {
      await supabase.from('exam_assignments').delete().eq('exam_id', id).eq('student_id', studentId)
      setAssignedStudents((prev) => prev.filter((s) => s !== studentId))
    } else {
      await supabase.from('exam_assignments').insert({ exam_id: id, student_id: studentId })
      setAssignedStudents((prev) => [...prev, studentId])
    }
  }

  if (!exam) return <div className="p-6 text-center text-gray-400">Inapakia...</div>

  const savedCount = questions.filter((q) => q.id).length
  const statusColor = { draft: 'secondary', published: 'success', closed: 'destructive' } as const
  const statusLabel = { draft: 'Rasimu', published: 'Imechapishwa', closed: 'Imefungwa' }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={statusColor[exam.status as keyof typeof statusColor]}>{statusLabel[exam.status as keyof typeof statusLabel]}</Badge>
            <span className="text-xs text-gray-400">{exam.duration_minutes} dakika • Alama {exam.total_marks}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 arabic-text">{exam.title}</h1>
        </div>
        {exam.status === 'draft' && (
          <Button onClick={publishExam} loading={publishing} variant="success" className="shrink-0">
            <Send className="w-4 h-4" /> Chapisha Mtihani
          </Button>
        )}
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['questions', 'assign'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'questions' ? `Maswali (${savedCount})` : `Assign Wanafunzi (${assignedStudents.length})`}
          </button>
        ))}
      </div>

      {/* Questions Tab */}
      {tab === 'questions' && (
        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <Card key={qIndex} className={q.saved ? 'border-green-200' : 'border-blue-200'}>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => updateQuestion(qIndex, 'expanded', !q.expanded)}>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">{qIndex + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 arabic-text line-clamp-1">
                      {q.text || 'Swali jipya...'}
                    </p>
                    <p className="text-xs text-gray-400">{q.type === 'mcq' ? 'MCQ' : 'Jibu Wazi'} • Alama {q.marks}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {q.saved && <Check className="w-4 h-4 text-green-500" />}
                  {q.expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {q.expanded && (
                <CardContent className="pt-0 space-y-4">
                  <div className="h-px bg-gray-100" />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Aina ya Swali</Label>
                      <select className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={q.type} onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}>
                        <option value="mcq">MCQ — اختيار من متعدد</option>
                        <option value="open">Jibu Wazi — إجابة حرة</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Alama</Label>
                      <Input type="number" min="0.5" step="0.5" value={q.marks}
                        onChange={(e) => updateQuestion(qIndex, 'marks', parseFloat(e.target.value) || 1)} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Maandishi ya Swali <span className="text-red-500">*</span></Label>
                    <Textarea
                      value={q.text} onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                      placeholder="اكتب نص السؤال هنا..." className="arabic-text" rows={3}
                    />
                  </div>

                  {q.type === 'mcq' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Majibu ya Kuchagua — اختر الإجابة الصحيحة</Label>
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <button
                            onClick={() => updateOption(qIndex, oIndex, 'is_correct', !opt.is_correct)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${opt.is_correct ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}
                          >
                            {opt.is_correct && <Check className="w-3 h-3" />}
                          </button>
                          <Input
                            value={opt.text} onChange={(e) => updateOption(qIndex, oIndex, 'text', e.target.value)}
                            placeholder={`الخيار ${oIndex + 1}`} className="arabic-text flex-1"
                          />
                          {q.options.length > 2 && (
                            <button onClick={() => removeOption(qIndex, oIndex)} className="text-gray-400 hover:text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {q.options.length < 6 && (
                        <button onClick={() => addOption(qIndex)} className="text-blue-600 text-sm flex items-center gap-1 hover:underline">
                          <Plus className="w-3 h-3" /> Ongeza Chaguo
                        </button>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs">Maelezo ya Jibu (hiari — itaonyeshwa baada ya mtihani)</Label>
                    <Textarea value={q.explanation} onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                      placeholder="اكتب شرحاً للإجابة الصحيحة..." className="arabic-text" rows={2} />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="destructive" size="sm" onClick={() => deleteQuestion(qIndex)}>
                      <Trash2 className="w-4 h-4" /> Futa
                    </Button>
                    <Button size="sm" onClick={() => saveQuestion(qIndex)} loading={saving}>
                      <Check className="w-4 h-4" /> Hifadhi Swali
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          <Button onClick={addQuestion} variant="outline" className="w-full border-dashed">
            <Plus className="w-4 h-4" /> Ongeza Swali Jipya — إضافة سؤال جديد
          </Button>
        </div>
      )}

      {/* Assign Tab */}
      {tab === 'assign' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5" /> Chagua Wanafunzi Watakaofanya Mtihani Huu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">
                Huna wanafunzi waliopewa kwako bado. Wasiliana na admin.
              </p>
            ) : (
              <div className="space-y-2">
                {students.map((student) => {
                  const isAssigned = assignedStudents.includes(student.id)
                  return (
                    <div key={student.id}
                      onClick={() => toggleStudentAssignment(student.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border-2 transition-all ${isAssigned ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-600 text-sm">
                          {student.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{student.full_name}</p>
                          <p className="text-xs text-gray-500">{student.email}</p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isAssigned ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        {isAssigned && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
