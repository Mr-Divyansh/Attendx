'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/stores/auth-store'
import { AdminDashboard } from '@/components/modules/admin-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'

export default function AdminPanelPage() {
  const { user, refresh, setUser, setCsrf } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    refresh().finally(() => setBooting(false))
  }, [refresh])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await apiFetch<{ ok: boolean; user: any; csrfToken: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, role: 'ADMIN' }),
        }
      )
      if (data.ok) {
        setUser(data.user)
        setCsrf(data.csrfToken)
        toast.success('Admin access granted')
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (booting) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center">
              <ShieldCheck className="size-7" />
            </div>
            <CardTitle>Administrator Access</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">Admin email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full h-11" disabled={loading}>
                {loading ? 'Signing in…' : 'Continue to admin dashboard'}
              </Button>
            </form>
            <Button
              variant="ghost"
              className="w-full mt-3"
              onClick={() => router.push('/')}
            >
              Back to website
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <AdminDashboard />
}
