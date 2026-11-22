import type { Metadata } from 'next'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot Password | AttendX',
  description: 'Request a secure AttendX password reset link.',
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ accountType?: string }>
}) {
  const { accountType } = await searchParams
  return <ForgotPasswordForm accountType={accountType === 'personal' ? 'personal' : 'college'} />
}
