import type { Metadata } from 'next'
import { LegalPageShell } from '@/components/legal-page-shell'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Learn how AttendX collects, uses, and protects your information when you use the platform as a student, teacher, administrator, or personal tracker user.',
  alternates: {
    canonical: '/privacy',
  },
}

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="August 13, 2026">
      <section><h2>Introduction</h2><p>This Privacy Policy explains how AttendX collects, uses, and protects information when you use the platform as a student, teacher, administrator, or personal tracker user. By using AttendX, you agree to the practices described here.</p></section>
      <section><h2>Information we collect</h2><p>AttendX collects the information needed to provide attendance management: account details, profile details, classroom memberships, subjects, timetables, and attendance records. The information shown depends on the type of account you use.</p></section>
      <section><h2>How we use information</h2><p>We use this information to authenticate users, display the appropriate dashboard, record and summarize attendance, operate class invitations and notifications, and provide analytics such as weekly and monthly reports. Teachers and administrators can see information needed for the classes they manage.</p></section>
      <section><h2>Authentication</h2><p>You can sign in with email and password or with Google. If you choose Google sign-in, AttendX receives the identity information permitted by Google to create or link your account. AttendX uses secure, HTTP-only session cookies to keep you signed in. Google's handling of its own services is governed by Google's policies.</p></section>
      <section><h2>Attendance data</h2><p>Attendance records are created by teachers or by you (in the Personal Tracker) and carry audit metadata such as who marked the record and when. AttendX presents records supplied through the application and does not independently verify them; raise genuine discrepancies with the relevant teacher or institution.</p></section>
      <section><h2>Data storage</h2><p>Account and attendance information is stored in the application database. Information is retained while an account or its associated academic records are required for the service, subject to administrator and legal requirements.</p></section>
      <section><h2>Third-party services</h2><p>AttendX may use hosting, database, Google authentication, and contact-form providers to operate the service. These providers process only the information needed to provide their services.</p></section>
      <section><h2>Security</h2><p>We use reasonable technical safeguards, including password hashing, role-based authorization, and CSRF protection. However, no online system can guarantee absolute security, and you are responsible for keeping your credentials private.</p></section>
      <section><h2>User rights</h2><p>You may request corrections to account or attendance information, ask for account assistance, or ask about deletion by contacting the relevant institution administrator or using the Contact Us page.</p></section>
      <section><h2>Contact</h2><p>For questions about this Privacy Policy or your data, please reach us through the Contact Us page.</p></section>
      <section><h2>Changes to this Privacy Policy</h2><p>We may update this policy as the service changes. When we do, the &ldquo;Last updated&rdquo; date above will reflect the revision. Continued use of AttendX after an update constitutes acceptance of the revised policy.</p></section>
    </LegalPageShell>
  )
}