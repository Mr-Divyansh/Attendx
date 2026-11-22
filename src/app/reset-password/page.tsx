import type { Metadata } from 'next'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Create a New Password | AttendX',
  description: 'Create a new password for your AttendX account.',
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
