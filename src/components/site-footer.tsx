import Image from 'next/image'
import Link from 'next/link'
import { Github } from 'lucide-react'

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`border-t bg-card ${compact ? 'mt-6' : 'mt-auto'}`}>
      <div className={`mx-auto w-full max-w-6xl px-4 ${compact ? 'py-6' : 'py-12 md:py-14'}`}>
        {compact ? (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="AttendX home">
              <span className="flex size-7 items-center justify-center overflow-hidden rounded-md border bg-background">
                <Image src="/Attendx-logo.png" alt="" width={28} height={28} className="size-full object-contain" />
              </span>
              <span className="text-sm font-semibold tracking-tight">AttendX</span>
            </Link>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <Link href="/contact" className="transition-colors hover:text-foreground">Contact</Link>
              <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            </nav>
            <p className="text-xs text-muted-foreground">© 2026 Divyansh Kumar</p>
          </div>
        ) : (
          <>
            <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
              <div className="max-w-sm">
                <Link href="/" className="inline-flex items-center gap-2.5" aria-label="AttendX home">
                  <span className="flex size-9 items-center justify-center overflow-hidden rounded-lg border bg-background shadow-sm">
                    <Image src="/Attendx-logo.png" alt="" width={36} height={36} className="size-full object-contain" />
                  </span>
                  <span className="text-base font-semibold tracking-tight text-foreground">AttendX</span>
                </Link>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  A focused attendance workspace for students, teachers, and independent learners.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground">Product</p>
                <nav className="mt-3 grid gap-2.5 text-sm text-muted-foreground">
                  <Link href="/" className="transition-colors hover:text-foreground">Student</Link>
                  <Link href="/" className="transition-colors hover:text-foreground">Teacher</Link>
                  <Link href="/" className="transition-colors hover:text-foreground">Personal Tracker</Link>
                </nav>
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground">Company</p>
                <nav className="mt-3 grid gap-2.5 text-sm text-muted-foreground">
                  <Link href="/contact" className="transition-colors hover:text-foreground">Contact Us</Link>
                  <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link>
                  <Link href="/terms" className="transition-colors hover:text-foreground">Terms &amp; Conditions</Link>
                </nav>
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground">Developer</p>
                <div className="mt-3 grid gap-2.5 text-sm text-muted-foreground">
                  <span>Created by Divyansh Kumar</span>
                  <a
                    href="https://github.com/Mr-Divyansh"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    <Github className="size-4" />
                    GitHub
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-1 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>© 2026 Divyansh Kumar. All rights reserved.</span>
              <span>Built for classrooms — attendance you can trust.</span>
            </div>
          </>
        )}
      </div>
    </footer>
  )
}
