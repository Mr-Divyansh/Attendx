'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  Database,
  LayoutDashboard,
  ShieldCheck,
  Users,
  UserCog,
  Search,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { DashboardShell, StatCard, type NavItem } from '@/components/dashboard-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

type Stats = {
  users: number
  administrators: number
  students: number
  subjects: number
  attendanceRecords: number
  disabledAccounts: number
  activeAccounts: number
  databaseConnected: boolean
  recentActivity: Array<{ id: string; action: string; actorRole: string | null; createdAt: string }>
}

type ManagedUser = {
  id: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT'
  disabled: boolean
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  student: { fullName: string; rollNo: string } | null
  teacher: { fullName: string } | null
  admin: { fullName: string } | null
}

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users & Roles', icon: UserCog },
  { id: 'audit', label: 'Audit Logs', icon: Activity },
]

export function MasterAdminDashboard() {
  const [active, setActive] = useState('overview')
  const titleMap: Record<string, string> = {
    overview: 'Master Admin Overview',
    users: 'Users & Role Management',
    audit: 'Security & Activity Audit',
  }

  return (
    <DashboardShell nav={NAV} active={active} onNavigate={setActive} title={titleMap[active]} accent="Super Admin">
      {active === 'overview' && <MasterOverview />}
      {active === 'users' && <MasterUsers />}
      {active === 'audit' && <MasterAudit />}
    </DashboardShell>
  )
}

function MasterOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<Stats>('/api/admin/super/stats')
      .then(setStats)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load system statistics'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Registered Users" value={stats.users} icon={Users} tone="primary" />
            <StatCard label="Administrators" value={stats.administrators} icon={ShieldCheck} tone="chart-2" />
            <StatCard label="Students" value={stats.students} icon={Users} tone="chart-5" />
            <StatCard label="Attendance Records" value={stats.attendanceRecords} icon={Activity} tone="chart-3" />
          </>
        )}
      </div>
      {stats && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2"><Database className="size-5 text-primary" /><h3 className="font-semibold">System Health</h3></div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Database</span><Badge variant={stats.databaseConnected ? 'default' : 'destructive'}>{stats.databaseConnected ? 'Connected' : 'Unavailable'}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Active accounts</span><span className="font-medium">{stats.activeAccounts}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Disabled accounts</span><span className="font-medium">{stats.disabledAccounts}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Subjects</span><span className="font-medium">{stats.subjects}</span></div>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-5 py-4"><h3 className="font-semibold">Recent System Activity</h3></div>
            {stats.recentActivity.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No recorded system activity.</p>
            ) : (
              <div className="divide-y">
                {stats.recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{item.action}</p><p className="text-xs text-muted-foreground">{item.actorRole ?? 'System'} · {new Date(item.createdAt).toLocaleString()}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MasterUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (role !== 'ALL') params.set('role', role)
      const data = await apiFetch<{ users: ManagedUser[] }>(`/api/admin/super/users?${params}`)
      setUsers(data.users)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [search, role])

  useEffect(() => { void load() }, [load])

  async function changeRole(userId: string, nextRole: ManagedUser['role']) {
    try {
      await apiFetch(`/api/admin/super/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role: nextRole }) })
      toast.success('User role updated')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Role update failed')
    }
  }

  async function toggleStatus(user: ManagedUser) {
    try {
      await apiFetch(`/api/admin/super/users/${user.id}/status`, { method: 'PATCH', body: JSON.stringify({ disabled: !user.disabled }) })
      toast.success(user.disabled ? 'Account activated' : 'Account disabled')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Status update failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" /></div>
        <Select value={role} onValueChange={setRole}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All roles</SelectItem><SelectItem value="SUPER_ADMIN">Super Admin</SelectItem><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="TEACHER">Teacher</SelectItem><SelectItem value="STUDENT">Student</SelectItem></SelectContent></Select>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last login</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5}><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No users found.</TableCell></TableRow>
            ) : users.map((user) => (
              <TableRow key={user.id}>
                <TableCell><p className="font-medium">{user.student?.fullName || user.teacher?.fullName || user.admin?.fullName || user.email}</p><p className="text-xs text-muted-foreground">{user.email}</p></TableCell>
                <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                <TableCell><Badge variant={user.disabled ? 'destructive' : 'secondary'}>{user.disabled ? 'Disabled' : 'Active'}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {user.role !== 'SUPER_ADMIN' && (
                      <Select value={user.role} onValueChange={(value) => changeRole(user.id, value as ManagedUser['role'])}>
                        <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="STUDENT">Student</SelectItem><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="SUPER_ADMIN">Super Admin</SelectItem></SelectContent>
                      </Select>
                    )}
                    {user.role !== 'SUPER_ADMIN' && <Button size="sm" variant="outline" onClick={() => toggleStatus(user)}>{user.disabled ? 'Activate' : 'Disable'}</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function MasterAudit() {
  const [logs, setLogs] = useState<Array<{ id: string; action: string; actorRole: string | null; targetType: string | null; targetId: string | null; ip: string | null; createdAt: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ logs: typeof logs }>('/api/admin/super/audit')
      .then((data) => setLogs(data.logs))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load audit logs'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Actor</TableHead><TableHead>Target</TableHead><TableHead>Source</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={5}><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></TableCell></TableRow> : logs.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No audit events.</TableCell></TableRow> : logs.map((log) => (
            <TableRow key={log.id}><TableCell className="font-medium">{log.action}</TableCell><TableCell>{log.actorRole ?? 'System'}</TableCell><TableCell>{log.targetType ? `${log.targetType}${log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ''}` : '—'}</TableCell><TableCell className="text-xs">{log.ip ?? '—'}</TableCell><TableCell className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
