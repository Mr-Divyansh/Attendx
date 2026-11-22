'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, KeyRound, Info } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { user, setUser, setCsrf } = useAuth()
  const router = useRouter()

  const reset = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirm('')
    setErr(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (newPassword !== confirm) {
      setErr('New passwords do not match')
      return
    }
    if (newPassword.length < 12) {
      setErr('New password must be at least 12 characters.')
      return
    }
    if (newPassword.length > 128) {
      setErr('New password must be at most 128 characters.')
      return
    }
    setBusy(true)
    try {
      await apiFetch(user?.role === 'PERSONAL' ? '/api/personal/change-password' : '/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword,
          confirm,
        }),
      })
      reset()
      onOpenChange(false)
      setUser(null)
      setCsrf(null)
      toast.success('Password updated. Sign in again to continue.')
      router.replace('/')
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Unable to change password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            Change password
          </DialogTitle>
          <DialogDescription>
            Set a new password for your account. If you already have a password,
            enter it to confirm your identity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {err && (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">Current password</Label>
            <PasswordInput
              id="cp-current"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={busy}
            />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="size-3.5" />
              Leave blank only if this account was created with Google and has
              no AttendX password yet.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">New password</Label>
            <PasswordInput
              id="cp-new"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">Confirm new password</Label>
            <PasswordInput
              id="cp-confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Use 12–128 characters with uppercase and lowercase letters, a number, and a symbol. Avoid your name or email.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
