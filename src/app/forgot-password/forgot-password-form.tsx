'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiFetch } from '@/lib/api'

export function ForgotPasswordForm({ accountType }: { accountType: 'college' | 'personal' }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await apiFetch('/api/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email, accountType }),
      })
      setSubmitted(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request a reset link right now.')
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
              <KeyRound className="size-5" />
            </span>
            <div className="space-y-1.5">
              <CardTitle className="text-2xl">Reset your password</CardTitle>
              <CardDescription className="leading-6">
                Enter the email address on your {accountType === 'personal' ? 'Personal Tracker' : 'AttendX'} account. We’ll send a one-use reset link if it matches an account.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <Alert className="border-primary/20 bg-primary/[0.035]">
                <Mail className="size-4 text-primary" />
                <AlertDescription className="leading-6">
                  If an account matches that account type and email, reset instructions will arrive if email delivery is available. The secure link expires in 30 minutes.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    maxLength={254}
                    disabled={busy}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  {busy ? 'Sending request…' : 'Send reset link'}
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
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          AttendX will never ask you to share your password or reset link.
        </p>
      </div>
    </main>
  )
}
