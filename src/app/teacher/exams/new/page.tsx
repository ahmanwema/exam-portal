'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowRight } from 'lucide-react'

export default function NewExamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    duration_minutes: '60',
    pass_marks: '',
    randomize_questions: 'true',
    show_results: 'true',
    show_answers: 'false',
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function getCreateErrorMessage(message: string) {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('row-level security')) {
      return 'Huna ruhusa ya kutengeneza mtihani. Hakikisha akaunti ya mwalimu imeidhinishwa na RLS policies zipo Supabase.'
    }

    if (lowerMessage.includes('infinite recursion')) {
      return 'RLS policies za exams zina recursion. Run security_fixes.sql kwenye Supabase kisha jaribu tena.'
    }

    if (lowerMessage.includes('column') || lowerMessage.includes('schema cache')) {
      return 'Database haijasasishwa kikamilifu. Run schema/security SQL kwenye Supabase kisha jaribu tena.'
    }

    return message || 'Hitilafu imetokea. Jaribu tena.'
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Tafadhali weka kichwa cha mtihani'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('Session imekwisha. Tafadhali ingia tena.')
      setLoading(false)
      return
    }

    const examPayload = {
      title: form.title,
      description: form.description || null,
      teacher_id: user.id,
      duration_minutes: parseInt(form.duration_minutes),
      pass_marks: form.pass_marks ? parseFloat(form.pass_marks) : null,
      randomize_questions: form.randomize_questions === 'true',
      show_results: form.show_results === 'true',
      show_answers: form.show_answers === 'true',
      status: 'draft',
      total_marks: 0,
    }

    let { data: exam, error: createError } = await supabase.from('exams').insert(examPayload).select('id').single()

    if (createError && (
      createError.message.toLowerCase().includes('column') ||
      createError.message.toLowerCase().includes('schema cache')
    )) {
      console.warn('Full exam insert failed, retrying with legacy payload:', createError)
      const { data: fallbackExam, error: fallbackError } = await supabase.from('exams').insert({
        title: form.title,
        description: form.description || null,
        teacher_id: user.id,
        duration_minutes: parseInt(form.duration_minutes),
        pass_marks: form.pass_marks ? parseFloat(form.pass_marks) : null,
        status: 'draft',
        total_marks: 0,
      }).select('id').single()

      exam = fallbackExam
      createError = fallbackError
    }

    if (createError || !exam) {
      console.error('Create exam failed:', createError)
      setError(getCreateErrorMessage(createError?.message ?? 'Mtihani haukuundwa. Jaribu tena.'))
      setLoading(false)
      return
    }

    router.push(`/teacher/exams/${exam.id}/edit`)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tengeneza Mtihani Mpya</h1>
        <p className="text-gray-500 text-sm arabic-text">إنشاء امتحان جديد</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maelezo ya Mtihani — تفاصيل الامتحان</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Kichwa cha Mtihani <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="مثال: اختبار النحو العربي"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className="arabic-text"
                required
              />
              <p className="text-xs text-gray-400">Unaweza kuandika kwa Kiarabu au Kiswahili</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Maelezo (hiari)</Label>
              <Textarea
                id="description"
                placeholder="اكتب وصفاً مختصراً للامتحان..."
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                className="arabic-text"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Muda (Dakika)</Label>
                <Select value={form.duration_minutes} onValueChange={(v) => update('duration_minutes', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 20, 30, 45, 60, 90, 120, 180].map((m) => (
                      <SelectItem key={m} value={String(m)}>{m} dakika</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pass_marks">Alama za Kufaulu (hiari)</Label>
                <Input
                  id="pass_marks"
                  type="number"
                  placeholder="mfano: 50"
                  value={form.pass_marks}
                  onChange={(e) => update('pass_marks', e.target.value)}
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Panga Maswali Nasibu?</Label>
                <Select value={form.randomize_questions} onValueChange={(v) => update('randomize_questions', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ndiyo (Salama Zaidi)</SelectItem>
                    <SelectItem value="false">Hapana</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Onyesha Matokeo?</Label>
                <Select value={form.show_results} onValueChange={(v) => update('show_results', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ndiyo</SelectItem>
                    <SelectItem value="false">Hapana</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Onyesha Majibu Sahihi?</Label>
                <Select value={form.show_answers} onValueChange={(v) => update('show_answers', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Hapana</SelectItem>
                    <SelectItem value="true">Ndiyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Endelea — Ongeza Maswali <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
