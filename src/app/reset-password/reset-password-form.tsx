'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'
import { apiFetch } from '@/lib/api'

export function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<'college' | 'personal'>('college')
  const [tokenReady, setTokenReady] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialLink = useRef<{ token: string | null; accountType: 'college' | 'personal' } | null>(null)

  useEffect(() => {
    if (!initialLink.current) {
      const fragment = window.location.hash.slice(1)
      const value = new URLSearchParams(fragment).get('token') ?? fragment
      initialLink.current = {
        token: /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null,
        accountType: new URLSearchParams(window.location.search).get('accountType') === 'personal' ? 'personal' : 'college',
      }
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }

    const timer = window.setTimeout(() => {
      setToken(initialLink.current?.token ?? null)
      setAccountType(initialLink.current?.accountType ?? 'college')
      setTokenReady(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!token) {
      setError('This reset link is invalid, expired, or has already been used.')
      return
    }
    if (newPassword !== confirm) {
      setError('New passwords do not match.')
      return
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError('Password must be between 12 and 128 characters.')
      return
    }

    setBusy(true)
    try {
      await apiFetch('/api/auth/password-reset/complete', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword, confirm }),
      })
      setToken(null)
      setNewPassword('')
      setConfirm('')
      setSuccess(true)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset your password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-40 size-[28rem] rounded-full bg-primary/[0.045] blur-3xl" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck className="size-5" /></span>
          AttendX
        </Link>
        <Card className="border-border/80 shadow-xl shadow-foreground/[0.04]">
          <CardHeader className="space-y-3 pb-4">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              {success ? <CheckCircle2 className="size-5" /> : <KeyRound className="size-5" />}
            </span>
            <div className="space-y-1.5">
              <CardTitle className="text-2xl">{success ? 'Password updated' : 'Create a new password'}</CardTitle>
              <CardDescription className="leading-6">
                {success
                  ? 'Your password has been changed and existing sessions have been signed out. Sign in with your new password.'
                  : 'Choose a unique password for your AttendX account. This reset link can only be used once.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {success ? (
              <Button asChild className="w-full"><Link href="/">Continue to sign in</Link></Button>
            ) : !tokenReady ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Checking secure reset link…
              </div>
            ) : !token ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertDescription>This reset link is invalid, expired, or has already been used. Request a new one to continue.</AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                  <Link href={`/forgot-password?accountType=${accountType}`}>Request another reset link</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                <div className="space-y-2">
                  <Label htmlFor="reset-new-password">New password</Label>
                  <PasswordInput
                    id="reset-new-password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    minLength={12}
                    maxLength={128}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm-password">Confirm new password</Label>
                  <PasswordInput
                    id="reset-confirm-password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    required
                    minLength={12}
                    maxLength={128}
                    disabled={busy}
                  />
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Use 12–128 characters with uppercase and lowercase letters, a number, and a symbol. Avoid your name, email, and common passwords.
                </p>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  {busy ? 'Updating password…' : 'Update password'}
                </Button>
              </form>
            )}
            <Link
              href="/"
              className="mt-5 inline-flex min-h-9 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ArrowLeft className="size-4" />
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
