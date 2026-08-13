'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SiteFooter } from '@/components/site-footer'

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) })
      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Unable to send your message.')
      event.currentTarget.reset()
      setStatus('success')
      setMessage('Thanks for reaching out. Your message has been sent.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to send your message.')
    }
  }

  return <div className="flex min-h-screen flex-col bg-muted/30">
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16">
      <Button asChild variant="ghost" className="mb-6 -ml-3"><Link href="/"><ArrowLeft className="mr-2 size-4" />Back to AttendX</Link></Button>
      <Card>
        <CardHeader><CardTitle>Contact Us</CardTitle><CardDescription>Send a message to the AttendX team. We will use the details only to respond to your request.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" autoComplete="name" required minLength={2} /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
            <div className="space-y-2"><Label htmlFor="message">Message</Label><Textarea id="message" name="message" required minLength={10} rows={6} /></div>
            {message && <p role="status" className={status === 'success' ? 'text-sm text-emerald-700 dark:text-emerald-400' : 'text-sm text-destructive'}>{message}</p>}
            <Button type="submit" disabled={status === 'sending'}>{status === 'sending' && <Loader2 className="mr-2 size-4 animate-spin" />}Send message</Button>
          </form>
        </CardContent>
      </Card>
    </main>
    <SiteFooter />
  </div>
}
