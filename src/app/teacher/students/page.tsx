import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { GraduationCap, Mail } from 'lucide-react'

export default async function TeacherStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  interface StudentRow { id: string; full_name: string; email: string }

  const { data: assignments } = await supabase
    .from('teacher_students')
    .select('student_id, profiles!student_id(id, full_name, email)')
    .eq('teacher_id', user!.id)

  const students: StudentRow[] = (assignments ?? [])
    .map((a) => (a as unknown as { profiles: StudentRow | null }).profiles)
    .filter((p): p is StudentRow => p !== null)

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wanafunzi Wangu</h1>
        <p className="text-gray-500 text-sm arabic-text">طلابي ({students.length})</p>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-20">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Huna wanafunzi waliopewa kwako bado.</p>
          <p className="text-gray-400 text-sm mt-1">Wasiliana na admin ili wanafunzi waongezwe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700 text-lg">
                    {student.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{student.full_name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {student.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
