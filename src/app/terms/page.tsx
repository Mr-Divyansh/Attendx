import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
export default function TermsPage() { return <div className="flex min-h-screen flex-col"><main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16"><h1 className="text-3xl font-semibold">Terms &amp; Conditions</h1><p className="mt-5 text-muted-foreground">Use AttendX responsibly and only with accurate attendance information. Contact us if you have questions about these terms.</p><Link href="/" className="mt-8 inline-block text-sm font-medium text-primary">Back to AttendX</Link></main><SiteFooter /></div> }
