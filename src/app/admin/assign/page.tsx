'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { UserPlus, X } from 'lucide-react'
import type { Profile } from '@/types'

type AssignmentRow = {
  id: string
  teacher_id: string
  student_id: string
  assigned_at: string
  teacher: { full_name: string; email: string } | null
  student: { full_name: string; email: string } | null
}

export default function AdminAssignPage() {
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [students, setStudents] = useState<Profile[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const [{ data: tData }, { data: sData }, { data: aData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'teacher').eq('status', 'approved'),
      supabase.from('profiles').select('*').eq('role', 'student').eq('status', 'approved'),
      supabase.from('teacher_students').select('id, teacher_id, student_id, assigned_at, teacher:profiles!teacher_id(full_name, email), student:profiles!student_id(full_name, email)'),
    ])
    setTeachers(tData ?? [])
    setStudents(sData ?? [])
    setAssignments((aData ?? []) as unknown as AssignmentRow[])
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadData() }, [loadData])

  async function assign() {
    if (!selectedTeacher || !selectedStudent) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('teacher_students').insert({
      teacher_id: selectedTeacher,
      student_id: selectedStudent,
    })
    if (error) {
      setMessage(error.code === '23505' ? '⚠️ Mwanafunzi huyu tayari amepewa mwalimu huyu.' : '❌ Hitilafu imetokea.')
    } else {
      setMessage('✅ Imefanikiwa! Mwanafunzi amepewa mwalimu.')
      setSelectedStudent('')
      loadData()
    }
    setLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  async function removeAssignment(id: string) {
    const supabase = createClient()
    await supabase.from('teacher_students').delete().eq('id', id)
    void loadData()
  }

  const assignmentsByTeacher = assignments.reduce((acc: Record<string, AssignmentRow[]>, a) => {
    const tid = a.teacher_id
    if (!acc[tid]) acc[tid] = []
    acc[tid].push(a)
    return acc
  }, {})

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assign Wanafunzi kwa Walimu</h1>
        <p className="text-gray-500 text-sm arabic-text">تعيين الطلاب للمعلمين</p>
      </div>

      {/* Assignment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Ongeza Assignment Mpya
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className={`text-sm px-4 py-3 rounded-lg ${message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Chagua Mwalimu — اختر معلماً</label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="Chagua mwalimu..." />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name} — {t.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Chagua Mwanafunzi — اختر طالباً</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Chagua mwanafunzi..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={assign} loading={loading} disabled={!selectedTeacher || !selectedStudent}>
            <UserPlus className="w-4 h-4" /> Assign — تعيين
          </Button>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignments za Sasa ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(assignmentsByTeacher).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Hakuna assignments bado</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(assignmentsByTeacher).map(([teacherId, teacherAssignments]) => {
                const teacherProfile =
                  teachers.find((t) => t.id === teacherId) ?? teacherAssignments[0]?.teacher
                return (
                  <div key={teacherId}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                        {teacherProfile?.full_name?.charAt(0) ?? 'M'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{teacherProfile?.full_name}</p>
                        <p className="text-xs text-gray-500">{teacherAssignments.length} wanafunzi</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mr-10">
                      {teacherAssignments.map((a) => (
                        <Badge key={a.id} variant="secondary" className="flex items-center gap-1 pr-1">
                          {a.student?.full_name}
                          <button onClick={() => removeAssignment(a.id)} className="hover:text-red-500 ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
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
