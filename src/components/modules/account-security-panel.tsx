'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock3, KeyRound, LockKeyhole, Monitor, RefreshCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { ChangePasswordDialog } from '@/components/change-password-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/stores/auth-store'

type SecurityInfo = {
  role: string
  hasPassword: boolean
  passwordChangedAt: string | null
  lastLoginAt: string | null
  sessionMaxAgeDays: number
  individualSessionsAvailable: boolean
  providers: string[]
}

export function AccountSecurityPanel() {
  const { user } = useAuth()
  const [info, setInfo] = useState<SecurityInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
      setError(null)
    }
    try {
      setInfo(await apiFetch<SecurityInfo>('/api/auth/security'))
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Could not load account security.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => load(false))
  }, [load])

  return (
    <div className="page-enter space-y-5">
      <Card className="overflow-hidden border-primary/15">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">Account protection</h2>
                <Badge variant="secondary">{user?.role === 'PERSONAL' ? 'Personal Tracker' : 'AttendX account'}</Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Manage your password and review the security controls available for this account.
              </p>
            </div>
          </div>
          <Button onClick={() => setPasswordDialogOpen(true)}>
            <KeyRound className="size-4" />
            Change password
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LockKeyhole className="size-4 text-primary" />
              Password
            </CardTitle>
            <CardDescription>
              Use a unique password for AttendX. Changes immediately sign out all existing sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-16 rounded-lg" />
            ) : error ? (
              <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
                  <RefreshCw className="size-4" />
                  Try again
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">{info?.hasPassword ? 'Password enabled' : 'Password not set'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {info?.passwordChangedAt
                        ? `Last updated ${new Date(info.passwordChangedAt).toLocaleString()}`
                        : info?.hasPassword
                          ? 'Password change date is not available.'
                          : 'This account currently signs in with a linked provider.'}
                    </p>
                  </div>
                  <Badge variant={info?.hasPassword ? 'default' : 'secondary'}>
                    {info?.hasPassword ? 'Protected' : 'Provider sign-in'}
                  </Badge>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Use 12–128 characters with uppercase and lowercase letters, a number, and a symbol.</li>
                  <li>• Avoid common passwords and information from your name or email.</li>
                  <li>• Use a different password from other websites.</li>
                </ul>
                <a
                  href={`/forgot-password?accountType=${user?.role === 'PERSONAL' ? 'personal' : 'college'}`}
                  className="inline-flex min-h-9 items-center rounded-md text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Forgot your password?
                </a>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="size-4 text-primary" />
              Sessions and sign-in
            </CardTitle>
            <CardDescription>
              Current session information and the controls supported by AttendX authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">This browser session</p>
                  <p className="text-xs text-muted-foreground">
                    {info ? 'Authenticated and protected by an HttpOnly cookie' : 'Session status is not available.'}
                  </p>
                </div>
              </div>
              <Badge variant={info ? 'default' : 'secondary'}>
                {info ? 'Active' : loading ? 'Checking' : 'Unavailable'}
              </Badge>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Session lifetime</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Sessions expire after up to {info?.sessionMaxAgeDays ?? 7} days. AttendX does not currently list individual devices; changing your password revokes all sessions.
                </p>
              </div>
            </div>
            {info?.lastLoginAt && (
              <p className="px-1 text-xs text-muted-foreground">
                Last successful sign-in: {new Date(info.lastLoginAt).toLocaleString()}
              </p>
            )}
            {info?.providers?.length ? (
              <div className="flex flex-wrap gap-2">
                {info.providers.map((provider) => <Badge key={provider} variant="outline">{provider}</Badge>)}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </div>
  )
}
