import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'

export function LegalPageShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border bg-card shadow-sm">
              <Image src="/Attendx-logo.png" alt="AttendX logo" width={36} height={36} className="h-full w-full object-contain" priority />
            </div>
            <span className="text-xl font-bold tracking-tight">AttendX</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" />Back to home
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 md:py-16">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
          <div className="mt-10 space-y-8 [&_h2]:mt-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground">{children}</div>
          <div className="mt-12 rounded-xl border bg-card p-5 text-sm text-muted-foreground">This page uses general, plain-language terms for an attendance application. It is not legal advice and should be reviewed by a qualified professional before production reliance.</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
