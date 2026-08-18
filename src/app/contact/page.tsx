'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, MessageSquareText } from 'lucide-react'
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
    setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) })
      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Unable to send your message. Please try again.')
      event.currentTarget.reset()
      setStatus('success')
      setMessage('Your message has been sent successfully.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to send your message. Please try again.')
    }
  }

  return <div className="flex min-h-screen flex-col bg-muted/30">
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
      <Button asChild variant="ghost" className="mb-8 -ml-3"><Link href="/"><ArrowLeft className="mr-2 size-4" />Back to AttendX</Link></Button>
      <div className="grid items-start gap-6 lg:grid-cols-[.8fr_1.2fr] lg:gap-10">
        <section className="py-2 lg:sticky lg:top-24">
          <div className="mb-5 flex size-11 items-center justify-center rounded-xl border bg-card text-primary shadow-sm"><MessageSquareText className="size-5" /></div>
          <p className="text-sm font-semibold text-primary">SUPPORT</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Contact AttendX</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">Have a question, found a bug, or need help? Send us a message and include enough detail for us to understand the issue.</p>
          <div className="mt-8 rounded-xl border bg-card p-5 text-sm text-muted-foreground"><p className="font-medium text-foreground">Before you send</p><p className="mt-1.5 leading-6">For account or attendance corrections, include the relevant class and date. Never share your password, session information, or API keys.</p></div>
        </section>
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-5"><CardTitle>Send a message</CardTitle><CardDescription>All fields are required. We use your email only to follow up on this request.</CardDescription></CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" autoComplete="name" required minLength={2} placeholder="Your name" /></div><div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div></div>
              <div className="space-y-2"><Label htmlFor="subject">Subject</Label><Input id="subject" name="subject" required minLength={2} maxLength={160} placeholder="How can we help?" /></div>
              <div className="space-y-2"><Label htmlFor="message">Message</Label><Textarea id="message" name="message" required minLength={10} rows={7} placeholder="Tell us how we can help..." /></div>
              {message && <p role="status" className={`flex items-center gap-2 text-sm ${status === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}>{status === 'success' && <CheckCircle2 className="size-4" />}{message}</p>}
              <Button type="submit" size="lg" disabled={status === 'sending'} className="w-full sm:w-auto">{status === 'sending' && <Loader2 className="mr-2 size-4 animate-spin" />}{status === 'sending' ? 'Sending message' : 'Send message'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
    <SiteFooter />
  </div>
}
