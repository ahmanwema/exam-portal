'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, CheckCircle, UserX, GraduationCap, School } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Profile, UserStatus, UserRole } from '@/types'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'teacher' | 'student'>('all')
  const [loading, setLoading] = useState(true)
  const [changingRole, setChangingRole] = useState<string | null>(null)

  const loadProfiles = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'admin')
      .order('created_at', { ascending: false })
    setProfiles(data ?? [])
    setLoading(false)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadProfiles() }, [loadProfiles])

  async function approveTeacher(id: string) {
    const supabase = createClient()
    await supabase.from('profiles').update({ status: 'approved' }).eq('id', id)
    void loadProfiles()
  }

  async function suspendUser(id: string) {
    const supabase = createClient()
    await supabase.from('profiles').update({ status: 'suspended' }).eq('id', id)
    void loadProfiles()
  }

  async function restoreUser(id: string) {
    const supabase = createClient()
    await supabase.from('profiles').update({ status: 'approved' }).eq('id', id)
    void loadProfiles()
  }

  async function changeRole(id: string, newRole: UserRole) {
    setChangingRole(id)
    const supabase = createClient()
    await supabase.from('profiles').update({
      role: newRole,
      status: newRole === 'teacher' ? 'approved' : 'approved',
    }).eq('id', id)
    void loadProfiles()
    setChangingRole(null)
  }

  const filtered = profiles.filter((p) => {
    const matchSearch =
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
    if (filter === 'pending') return matchSearch && p.status === 'pending'
    if (filter === 'teacher') return matchSearch && p.role === 'teacher'
    if (filter === 'student') return matchSearch && p.role === 'student'
    return matchSearch
  })

  const roleLabel: Record<string, string> = { teacher: 'Mwalimu', student: 'Mwanafunzi' }
  const statusBadge: Record<UserStatus, BadgeVariant> = {
    approved: 'success', pending: 'warning', suspended: 'destructive',
  }
  const statusLabel: Record<UserStatus, string> = {
    approved: 'Ameidhinishwa', pending: 'Inasubiri', suspended: 'Amesimamishwa',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Simamia Watumiaji</h1>
        <p className="text-gray-500 text-sm arabic-text">إدارة المستخدمين</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Tafuta jina au barua pepe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'teacher', 'student'] as const).map((f) => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'Wote' : f === 'pending' ? 'Wanasubiri' : f === 'teacher' ? 'Walimu' : 'Wanafunzi'}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Watumiaji ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-400 py-8">Inapakia...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Hakuna watumiaji</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((profile) => (
                <div key={profile.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl gap-3">
                  {/* Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-600 shrink-0">
                      {profile.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{profile.full_name}</p>
                      <p className="text-sm text-gray-500">{profile.email}</p>
                      <p className="text-xs text-gray-400">{formatDate(profile.created_at)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Role badges */}
                    <Badge variant={profile.role === 'teacher' ? 'default' : 'secondary'}>
                      {roleLabel[profile.role]}
                    </Badge>
                    <Badge variant={statusBadge[profile.status]}>
                      {statusLabel[profile.status]}
                    </Badge>

                    {/* Change role button */}
                    {profile.role === 'student' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={changingRole === profile.id}
                        onClick={() => changeRole(profile.id, 'teacher')}
                        title="Badilisha kuwa Mwalimu"
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <School className="w-3.5 h-3.5" />
                        → Mwalimu
                      </Button>
                    ) : profile.role === 'teacher' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={changingRole === profile.id}
                        onClick={() => changeRole(profile.id, 'student')}
                        title="Badilisha kuwa Mwanafunzi"
                        className="text-gray-600 border-gray-300 hover:bg-gray-100"
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        → Mwanafunzi
                      </Button>
                    ) : null}

                    {/* Status actions */}
                    {profile.status === 'pending' && (
                      <Button size="sm" variant="success" onClick={() => approveTeacher(profile.id)} title="Idhinisha">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {profile.status === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => suspendUser(profile.id)} title="Simamisha">
                        <UserX className="w-4 h-4" />
                      </Button>
                    )}
                    {profile.status === 'suspended' && (
                      <Button size="sm" variant="success" onClick={() => restoreUser(profile.id)} title="Rudisha">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
