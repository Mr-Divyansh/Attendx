'use client'

import { useState } from 'react'
import { useAuth, type Role, type SessionUser } from '@/stores/auth-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { GraduationCap, Users, UserCog, Target, Loader2 } from 'lucide-react'

const roleMeta: Record<Role, { icon: React.ElementType; label: string; hint: string; demo: string }> = {
  STUDENT: { icon: GraduationCap, label: 'Student', hint: 'student1@attendx.edu', demo: 'student123' },
  TEACHER: { icon: Users, label: 'Teacher', hint: 'rao@attendx.edu', demo: 'teacher123' },
  ADMIN: { icon: UserCog, label: 'Admin', hint: 'admin@attendx.edu', demo: 'admin123' },
  PERSONAL: { icon: Target, label: 'Personal', hint: 'riya', demo: 'personal123' },
}

export function AuthModal() {
  const { loginRole, openLogin, setUser, setCsrf, setView } = useAuth()
  const open = loginRole !== null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  // Personal mode uses tabs: login vs register
  const isPersonal = loginRole === 'PERSONAL'

  const close = () => openLogin(null) // reset
  const reset = () => {
    setEmail(''); setPassword(''); setUsername(''); setFullName(''); setConfirm('')
  }

  const handleCollegeLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginRole || loginRole === 'PERSONAL') return
    setBusy(true)
    try {
      const data = await apiFetch<{ user: SessionUser; csrfToken: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role: loginRole }),
      })
      setUser(data.user)
      setCsrf(data.csrfToken)
      toast.success(`Welcome back, ${data.user.name}!`)
      reset()
      close()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handlePersonalLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const data = await apiFetch<{ user: SessionUser; csrfToken: string }>('/api/auth/login-personal', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      setUser(data.user)
      setCsrf(data.csrfToken)
      toast.success(`Welcome, ${data.user.name}!`)
      reset()
      close()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const data = await apiFetch<{ user: SessionUser; csrfToken: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, username, password, confirm }),
      })
      setUser(data.user)
      setCsrf(data.csrfToken)
      toast.success('Account created. Welcome to AttendX Personal!')
      reset()
      close()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const meta = loginRole ? roleMeta[loginRole] : roleMeta.STUDENT

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-2">
            <meta.icon className="size-6" />
          </div>
          <DialogTitle>
            {isPersonal ? 'Personal Attendance Tracker' : `${meta.label} Login`}
          </DialogTitle>
          <DialogDescription>
            {isPersonal
              ? 'Self-contained tracker — no college required.'
              : 'Enter your institutional credentials to continue.'}
          </DialogDescription>
        </DialogHeader>

        {!isPersonal ? (
          <form onSubmit={handleCollegeLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={meta.hint}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Password</Label>
              <Input
                id="pwd"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
              Sign in as {meta.label}
            </Button>
            {process.env.NODE_ENV !== 'production' && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                Demo (dev only): <span className="font-mono">{meta.hint}</span> /{' '}
                <span className="font-mono">{meta.demo}</span>
              </p>
            )}
          </form>
        ) : (
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handlePersonalLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="uname">Username</Label>
                  <Input
                    id="uname"
                    placeholder="riya"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ppwd">Password</Label>
                  <Input
                    id="ppwd"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Sign in
                </Button>
                {process.env.NODE_ENV !== 'production' && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    Demo (dev only): <span className="font-mono">riya</span> /{' '}
                    <span className="font-mono">personal123</span>
                  </p>
                )}
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fn">Full Name</Label>
                  <Input
                    id="fn"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ru">Username</Label>
                  <Input
                    id="ru"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp">Password</Label>
                  <Input
                    id="rp"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rc">Confirm Password</Label>
                  <Input
                    id="rc"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
