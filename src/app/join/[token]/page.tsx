'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/stores/auth-store'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, GraduationCap, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

export default function JoinClassroomPage() {
  const params = useParams()
  const token = String(params.token || '').toUpperCase()
  const router = useRouter()
  const { user, loading, refresh, openLogin } = useAuth()
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (token && token !== '[TOKEN]') setJoinCode(token.slice(0, 6))
  }, [token])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || user.role !== 'STUDENT') {
      openLogin('STUDENT')
      toast.message('Sign in as a student first to join this classroom.')
      return
    }
    setJoining(true)
    try {
      await apiFetch('/api/classrooms/join', {
        method: 'POST',
        body: JSON.stringify({
          joinCode: joinCode.trim(),
          inviteToken: token.length > 6 ? token : undefined,
        }),
      })
      toast.success('Join request sent! Your teacher will approve your membership.')
      router.push('/')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center">
            <GraduationCap className="size-7" />
          </div>
          <CardTitle className="text-2xl">Join Classroom</CardTitle>
          <CardDescription>
            Enter the join code from your teacher or use the invite link they shared.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-2">
                <KeyRound className="size-4 text-muted-foreground" />
                Join code
              </label>
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="8K4P92"
                className="text-center text-lg tracking-widest font-mono h-12"
                maxLength={12}
                required
              />
            </div>
            {!user ? (
              <Button
                type="button"
                className="w-full h-11"
                onClick={() => openLogin('STUDENT')}
              >
                Sign in to join
              </Button>
            ) : user.role !== 'STUDENT' ? (
              <p className="text-sm text-destructive text-center">
                Only student accounts can join classrooms.
              </p>
            ) : (
              <Button type="submit" className="w-full h-11" disabled={joining}>
                {joining ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : null}
                Join classroom
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
