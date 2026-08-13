import { LegalPageShell } from '@/components/legal-page-shell'

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms & Conditions" updated="August 13, 2026">
      <section><h2>Acceptance and accounts</h2><p>By using AttendX, you agree to use it responsibly and provide accurate account information. Keep your sign-in credentials private and notify the relevant administrator if you believe your account has been used without permission.</p></section>
      <section><h2>Attendance information</h2><p>Teachers and authorized administrators are responsible for recording attendance accurately. Students should review their records and raise any genuine discrepancy with the appropriate teacher or institution. AttendX presents records supplied through the application; it does not independently verify them.</p></section>
      <section><h2>Acceptable use</h2><p>Do not attempt to access another person&apos;s account, alter records without permission, disrupt the service, submit harmful content, or use AttendX in a way that violates applicable rules or law. Institutions may set additional policies for their users.</p></section>
      <section><h2>Third parties and availability</h2><p>Some features rely on third-party services, including authentication, hosting, databases, and contact forms. Those services may have separate terms. We aim to keep AttendX available, but maintenance, outages, or changes may temporarily affect access.</p></section>
      <section><h2>Termination, accuracy, and changes</h2><p>Accounts may be restricted or removed where misuse, inaccurate information, or institutional policy requires it. The service is provided as available; to the extent permitted by law, AttendX is not liable for indirect losses arising from use or unavailability. These terms may change as the service evolves.</p></section>
      <section><h2>Contact</h2><p>For questions about these terms or the service, use the Contact Us page.</p></section>
    </LegalPageShell>
  )
}
