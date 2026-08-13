import type { Metadata } from 'next'
import { LegalPageShell } from '@/components/legal-page-shell'

export const metadata: Metadata = {
  title: 'Terms & Conditions — AttendX',
  description: 'Terms and conditions for using AttendX, a student and personal attendance management platform.',
}

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms & Conditions"
      updated={new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
    >
      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account or using AttendX in any capacity — as a student,
          teacher, administrator, or personal tracker user — you agree to these
          Terms &amp; Conditions. If you do not agree, please do not use the
          service.
        </p>
      </section>

      <section>
        <h2>2. Account Responsibilities</h2>
        <p>You are responsible for:</p>
        <ul>
          <li>Providing accurate registration information.</li>
          <li>Keeping your password confidential and secure.</li>
          <li>All activity that happens under your account.</li>
          <li>Notifying us if you believe your account has been compromised.</li>
        </ul>
      </section>

      <section>
        <h2>3. Attendance Data</h2>
        <p>
          Attendance records created in AttendX — whether marked by a teacher in a
          classroom, or logged independently in the Personal Tracker — are provided
          as a convenience tool. <strong>AttendX does not guarantee</strong> that
          attendance records are complete, error-free, or accepted as an official
          record by any institution. Always confirm your official attendance status
          through your college or organisation where it matters academically.
        </p>
      </section>

      <section>
        <h2>4. User Responsibilities</h2>
        <ul>
          <li>Use the service only for its intended purpose of tracking attendance.</li>
          <li>Do not attempt to falsify, tamper with, or misrepresent attendance data.</li>
          <li>Do not share your login credentials with others.</li>
          <li>Do not attempt to access accounts, classrooms, or data that are not yours.</li>
        </ul>
      </section>

      <section>
        <h2>5. Acceptable Use</h2>
        <p>You agree not to use AttendX to:</p>
        <ul>
          <li>Interfere with or disrupt the service, servers, or networks connected to it.</li>
          <li>Attempt to gain unauthorized access to any part of the system.</li>
          <li>Upload or transmit malicious code, or misuse the classroom join/invite system.</li>
          <li>Use the service in any way that violates applicable laws.</li>
        </ul>
      </section>

      <section>
        <h2>6. Service Availability</h2>
        <p>
          We aim to keep AttendX available and reliable, but the service is provided
          on an <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>{' '}
          basis. Scheduled maintenance, updates, or unforeseen issues may cause
          temporary downtime. We do not guarantee uninterrupted access.
        </p>
      </section>

      <section>
        <h2>7. Data Accuracy</h2>
        <p>
          Attendance percentages, predictions, and statistics shown in AttendX are
          calculated automatically from the records entered into the system. Their
          accuracy depends entirely on the accuracy of the underlying data entered
          by teachers, students, or personal-tracker users.
        </p>
      </section>

      <section>
        <h2>8. Third-Party Services</h2>
        <p>
          AttendX offers sign-in via Google OAuth. Your use of Google to
          authenticate is also subject to Google&rsquo;s own terms of service and
          privacy policy. We are not responsible for the availability or behaviour
          of third-party services we integrate with.
        </p>
      </section>

      <section>
        <h2>9. Account Termination</h2>
        <p>
          We may suspend or disable an account that violates these terms, is used
          for abusive or fraudulent activity, or poses a security risk to the
          platform or other users. You may request deletion of your own account and
          associated data at any time.
        </p>
      </section>

      <section>
        <h2>10. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, AttendX and its operators are not
          liable for any indirect, incidental, or consequential damages arising
          from your use of, or inability to use, the service — including academic,
          financial, or reputational consequences resulting from attendance data
          discrepancies.
        </p>
      </section>

      <section>
        <h2>11. Changes to Terms</h2>
        <p>
          These terms may be updated from time to time as the product evolves. We
          will update the &ldquo;Last updated&rdquo; date above when changes are
          made. Continued use of AttendX after changes means you accept the revised
          terms.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Questions about these terms can be raised through the contact channel
          linked in the app, or via the project&rsquo;s GitHub repository.
        </p>
      </section>
    </LegalPageShell>
  )
}
