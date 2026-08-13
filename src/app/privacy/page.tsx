import { LegalPageShell } from '@/components/legal-page-shell'

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="August 13, 2026">
      <section><h2>Information we collect</h2><p>AttendX collects the information needed to provide attendance management: account details, profile details, classroom memberships, schedules, and attendance records. The information shown depends on whether you use a student, teacher, administrator, or personal tracker account.</p></section>
      <section><h2>How information is used</h2><p>We use this information to authenticate users, show the appropriate dashboard, record attendance, provide attendance summaries, and operate class invitations and notifications. Teachers and administrators can see information needed for the classes they manage.</p></section>
      <section><h2>Google sign-in and sessions</h2><p>If you choose Google sign-in, AttendX receives the identity information permitted by Google to create or link your account. AttendX uses secure, HTTP-only session cookies to keep you signed in. Google&apos;s handling of its services is governed by Google&apos;s own policies.</p></section>
      <section><h2>Storage, security, and retention</h2><p>Account and attendance information is stored in the application database. We use reasonable technical safeguards, but no online system can promise absolute security. Information is retained while an account or its associated academic records are required for the service, subject to administrator and legal requirements.</p></section>
      <section><h2>Third-party services</h2><p>AttendX may use hosting, database, Google authentication, and contact-form providers to operate the service. These providers process only the information needed to provide their services.</p></section>
      <section><h2>Your choices and policy updates</h2><p>Contact the relevant institution administrator to correct account or attendance information, request account assistance, or ask about deletion. We may update this policy when the service changes; the date above will be updated when we do.</p></section>
    </LegalPageShell>
  )
}
