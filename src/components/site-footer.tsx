import Link from 'next/link'

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`border-t bg-card/60 ${compact ? 'mt-6' : 'mt-auto'}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-foreground">AttendX</p>
          <p className="mt-1">© 2026 AttendX. All rights reserved. Created by Divyansh.</p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Footer navigation">
          <Link href="/contact" className="hover:text-foreground">Contact Us</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms &amp; Conditions</Link>
          <a href="https://github.com/Mr-Divyansh" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a>
        </nav>
      </div>
    </footer>
  )
}
