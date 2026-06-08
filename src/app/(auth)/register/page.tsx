'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, GraduationCap, School } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type Role = 'student' | 'teacher'

function getRegisterErrorMessage(message: string) {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('already registered') || lowerMessage.includes('already been registered')) {
    return 'Barua pepe hii tayari imesajiliwa. Ingia badala yake.'
  }

  if (lowerMessage.includes('email') && lowerMessage.includes('confirm')) {
    return 'Angalia barua pepe yako na confirm akaunti yako kwanza.'
  }

  if (lowerMessage.includes('database error') || lowerMessage.includes('saving new user')) {
    return 'Usajili umeshindikana kwenye database. Hakikisha SQL fix ya signup imewekwa Supabase kisha jaribu tena.'
  }

  return message || 'Hitilafu imetokea. Jaribu tena.'
}

export default function RegisterPage() {
  const [role, setRole] = useState<Role>('student')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Nywila hazifanani. Jaribu tena.')
      return
    }
    if (password.length < 6) {
      setError('Nywila lazima iwe na herufi 6 au zaidi.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role,
          phone: phone.trim() || null,
        },
      },
    })

    if (signUpError) {
      console.error('Registration failed:', signUpError)
      setError(getRegisterErrorMessage(signUpError.message))
      setLoading(false)
      return
    }

    if (role === 'teacher') {
      window.location.href = '/pending'
    } else {
      window.location.href = '/student/dashboard'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <BookOpen className="w-8 h-8 text-blue-800" />
          </div>
          <h1 className="text-white font-bold text-2xl">Exam Portal</h1>
          <p className="text-blue-300 text-sm mt-1">إنشاء حساب جديد</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Akaunti Mpya</CardTitle>
            <CardDescription className="text-center">
              Jisajili kama mwalimu au mwanafunzi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  role === 'student'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <GraduationCap className="w-6 h-6" />
                <span className="font-medium text-sm">Mwanafunzi</span>
                <span className="text-xs opacity-70">طالب</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  role === 'teacher'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <School className="w-6 h-6" />
                <span className="font-medium text-sm">Mwalimu</span>
                <span className="text-xs opacity-70">معلم</span>
              </button>
            </div>

            {role === 'teacher' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg mb-4">
                ⚠️ Akaunti ya mwalimu inahitaji idhini ya admin kabla ya kutumia mfumo.
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Jina Kamili</Label>
                <Input
                  id="fullName"
                  placeholder="Jina lako kamili"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Barua Pepe</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mfano@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Nambari ya Simu (hiari)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+255 XXX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Nywila</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Angalau herufi 6"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Thibitisha Nywila</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Rudia nywila"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                {loading ? 'Inasajili...' : 'Jisajili — إنشاء حساب'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Una akaunti tayari?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Ingia hapa
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
