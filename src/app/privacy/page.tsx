import type { Metadata } from 'next'
import { LegalPageShell } from '@/components/legal-page-shell'

export const metadata: Metadata = {
  title: 'Privacy Policy — AttendX',
  description: 'How AttendX collects, uses, and protects your information.',
}

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      updated={new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
    >
      <section>
        <h2>1. Information We Collect</h2>
        <p>AttendX collects only the information needed to provide attendance tracking:</p>
        <ul>
          <li>
            <strong>Account information</strong> — name, email address, role
            (student, teacher, admin, or personal user), and a securely hashed
            password.
          </li>
          <li>
            <strong>Attendance information</strong> — classes, subjects, timetables,
            and attendance records you or your teacher create.
          </li>
          <li>
            <strong>Google authentication information</strong> — if you choose
            Google sign-in, we receive your name, email address, and profile
            picture from Google, used only to create or match your account.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. How We Use Your Data</h2>
        <p>Your data is used to:</p>
        <ul>
          <li>Authenticate you and maintain your session securely.</li>
          <li>Show your attendance records, statistics, and predictions.</li>
          <li>Let teachers manage classrooms and mark attendance for their students.</li>
          <li>Send in-app notifications relevant to your attendance.</li>
        </ul>
        <p>We do not sell your personal data to third parties.</p>
      </section>

      <section>
        <h2>3. Data Storage</h2>
        <p>
          Data is stored in a managed database accessed through the application
          backend. Passwords are never stored in plain text — they are hashed
          before storage. Access to production data is restricted.
        </p>
      </section>

      <section>
        <h2>4. Cookies &amp; Session Information</h2>
        <p>
          AttendX uses session cookies to keep you signed in and CSRF tokens to
          protect against cross-site request forgery. These are functional and
          necessary for the app to work — we do not use advertising or
          cross-site tracking cookies.
        </p>
      </section>

      <section>
        <h2>5. Third-Party Services</h2>
        <p>
          We use Google OAuth for optional sign-in. When you use it, Google
          shares basic profile information with AttendX as described above.
          Google&rsquo;s handling of your data is governed by Google&rsquo;s own
          privacy policy.
        </p>
      </section>

      <section>
        <h2>6. Data Security</h2>
        <p>
          We apply reasonable technical measures — password hashing,
          role-based authorization, CSRF protection, and server-side session
          validation — to protect your data. No online service can guarantee
          absolute security, and we cannot promise the platform is immune to
          every possible attack.
        </p>
      </section>

      <section>
        <h2>7. Data Retention</h2>
        <p>
          We retain account and attendance data for as long as your account is
          active, or as needed to provide the service. If you delete your
          account, associated personal data is removed within a reasonable
          period, except where retention is required for legitimate operational
          or legal reasons.
        </p>
      </section>

      <section>
        <h2>8. Your Rights</h2>
        <p>You can, at any time:</p>
        <ul>
          <li>View and update your profile information from your dashboard.</li>
          <li>Change your password.</li>
          <li>Request deletion of your account and associated data.</li>
        </ul>
      </section>

      <section>
        <h2>9. Account Deletion</h2>
        <p>
          To delete your account, use the account settings available in your
          dashboard, or contact us through the channel linked in the app.
          Deleting your account removes your access and personal profile data;
          some records may be retained in anonymised or aggregated form for
          operational integrity (for example, a classroom&rsquo;s historical
          attendance count).
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          For privacy-related questions, reach out through the contact channel
          linked in the app, or via the project&rsquo;s GitHub repository.
        </p>
      </section>

      <section>
        <h2>11. Policy Updates</h2>
        <p>
          This policy may change as AttendX evolves. We will update the
          &ldquo;Last updated&rdquo; date above whenever it does. We recommend
          checking this page periodically.
        </p>
      </section>
    </LegalPageShell>
  )
}
