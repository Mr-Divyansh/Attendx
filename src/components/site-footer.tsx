import Image from 'next/image'
import Link from 'next/link'

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`border-t bg-card ${compact ? 'mt-6' : 'mt-auto'}`}>
      <div className={`mx-auto w-full max-w-6xl px-4 ${compact ? 'py-5' : 'py-10 md:py-12'}`}>
        <div className={`grid gap-8 ${compact ? 'sm:grid-cols-[1fr_auto]' : 'sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]'}`}>
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="AttendX home">
              <span className="flex size-9 items-center justify-center overflow-hidden rounded-lg border bg-background shadow-sm"><Image src="/Attendx-logo.png" alt="" width={36} height={36} className="size-full object-contain" /></span>
              <span className="font-semibold tracking-tight text-foreground">AttendX</span>
            </Link>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">A focused attendance workspace for students, teachers, and independent learners.</p>
          </div>
          {!compact && <div><p className="text-sm font-semibold text-foreground">Product</p><nav className="mt-3 grid gap-2 text-sm text-muted-foreground"><Link href="/" className="transition-colors hover:text-foreground">Student</Link><Link href="/" className="transition-colors hover:text-foreground">Teacher</Link><Link href="/" className="transition-colors hover:text-foreground">Personal Tracker</Link></nav></div>}
          <div><p className="text-sm font-semibold text-foreground">Company</p><nav className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground"><Link href="/contact" className="transition-colors hover:text-foreground">Contact Us</Link><Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link><Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link><a href="https://github.com/Mr-Divyansh" target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">GitHub</a></nav></div>
        </div>
        <div className="mt-8 flex flex-col gap-1 border-t pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>© 2026 Divyansh Kumar. All rights reserved.</span><span>Created by Divyansh Kumar</span></div>
      </div>
    </footer>
  )
}
