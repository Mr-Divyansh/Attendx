'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/stores/auth-store'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'

export default function AdminPanelPage() {
  const { user, refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await apiFetch<{ ok: boolean; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role: 'ADMIN' }),
      })
      if (data.ok) {
        setAuthorized(true)
        toast.success('Admin access granted')
        await refresh()
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!user && !authorized) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input id="admin-email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="admin-password">Password</Label>
                <Input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button className="w-full" disabled={loading}>{loading ? 'Signing in…' : 'Continue'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTitle>Access denied</AlertTitle>
          <AlertDescription>Only administrators can access this area.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Administrator controls are available here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
