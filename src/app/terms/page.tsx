import { LegalPageShell } from '@/components/legal-page-shell'

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms & Conditions" updated="August 13, 2026">
      <section><h2>Acceptance of terms</h2><p>By accessing or using AttendX, you agree to these Terms &amp; Conditions. If you do not agree, please do not use the service. Institutions may set additional policies that apply to their users.</p></section>
      <section><h2>Use of AttendX</h2><p>AttendX provides attendance management for students and teachers, along with an independent Personal Attendance Tracker. You agree to use the platform responsibly and in accordance with applicable rules and law.</p></section>
      <section><h2>Student accounts</h2><p>Students may join classrooms from one or more teachers, view their attendance, subjects, timetable, and analytics. Students should review their records and raise genuine discrepancies with the appropriate teacher or institution.</p></section>
      <section><h2>Teacher accounts</h2><p>Teachers may create classrooms, invite students, manage subjects and timetables, and mark attendance. Teachers are responsible for recording attendance accurately and for managing the classes they own.</p></section>
      <section><h2>Personal Attendance Tracker</h2><p>The Personal Tracker lets you record your own attendance without joining a college or classroom. You are solely responsible for the accuracy of the data you enter, which remains private to your account.</p></section>
      <section><h2>User responsibilities</h2><p>You agree to provide accurate account information, keep your sign-in credentials private, and use AttendX only for its intended purpose. Notify the relevant administrator if you believe your account has been used without permission.</p></section>
      <section><h2>Attendance information</h2><p>AttendX presents records supplied through the application and does not independently verify them. Attendance records carry audit metadata such as who marked them and when.</p></section>
      <section><h2>Prohibited use</h2><p>Do not attempt to access another person&apos;s account, alter records without permission, disrupt or reverse-engineer the service, submit harmful or unlawful content, or use AttendX in any way that violates applicable rules or law.</p></section>
      <section><h2>Account security</h2><p>You are responsible for activity that occurs under your account. AttendX uses password hashing, role-based authorization, CSRF protection, and secure sessions, but you must protect your own credentials and devices.</p></section>
      <section><h2>Service availability</h2><p>We aim to keep AttendX available, but maintenance, outages, or changes to third-party services (authentication, hosting, databases, contact forms) may temporarily affect access. The service is provided on an &ldquo;as available&rdquo; basis.</p></section>
      <section><h2>Changes to the service</h2><p>We may update, add, or remove features, and may restrict or remove accounts where misuse, inaccurate information, or institutional policy requires it. These terms may change as the service evolves; the date above will reflect revisions.</p></section>
      <section><h2>Contact</h2><p>For questions about these terms or the service, please use the Contact Us page.</p></section>
    </LegalPageShell>
  )
}
