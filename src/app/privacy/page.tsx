import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
export default function PrivacyPage() { return <div className="flex min-h-screen flex-col"><main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16"><h1 className="text-3xl font-semibold">Privacy Policy</h1><p className="mt-5 text-muted-foreground">AttendX uses account and attendance data only to provide attendance management features. Contact us for privacy questions.</p><Link href="/" className="mt-8 inline-block text-sm font-medium text-primary">Back to AttendX</Link></main><SiteFooter /></div> }
