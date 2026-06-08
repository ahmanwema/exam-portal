'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('Barua pepe au nywila si sahihi. Jaribu tena.')
      setLoading(false)
      return
    }

    // Pata role ya mtumiaji
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', authData.user!.id)
      .single()

    if (profileError || !profile) {
      setError('Akaunti imepatikana, lakini profile/role haijasomeka. Hakikisha SQL security fixes zimewekwa na profile ina role sahihi.')
      setLoading(false)
      return
    }

    // Full page reload ili session ikubalike na server
    if (profile.status === 'pending')   { window.location.href = '/pending';   return }
    if (profile.status === 'suspended') { window.location.href = '/suspended'; return }
    window.location.href = `/${profile.role}/dashboard`
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
          <p className="text-blue-300 text-sm mt-1">مدخل الامتحانات</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Karibu Tena</CardTitle>
            <CardDescription className="text-center">
              Ingiza barua pepe na nywila yako
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

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
                <Label htmlFor="password">Nywila</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    dir="ltr"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                {loading ? 'Inaingia...' : 'Ingia — تسجيل الدخول'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Huna akaunti?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                Jisajili hapa
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
