import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

export function LegalPageShell({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 glass border-b">
        <div className="mx-auto w-full max-w-3xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border bg-card shadow-sm">
              <Image
                src="/Attendx-logo.png"
                alt="AttendX logo"
                width={36}
                height={36}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <span className="text-xl font-bold tracking-tight">AttendX</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>

          <div
            className="
              mt-10 space-y-8
              [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-2
              [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:text-sm [&_ul]:leading-relaxed [&_ul]:text-muted-foreground
              [&_li]:marker:text-primary/60
              [&_strong]:text-foreground [&_strong]:font-medium
            "
          >
            {children}
          </div>

          <div className="mt-12 surface-card p-5 text-sm text-muted-foreground">
            This page uses general, plain-language terms for a student and personal
            attendance application. It is not legal advice, and has not been reviewed
            by a lawyer. Please have it reviewed by a qualified professional before
            relying on it for a production service.
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t bg-card/50">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} AttendX</span>
          <nav className="flex items-center gap-5">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
