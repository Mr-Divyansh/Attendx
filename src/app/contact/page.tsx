import type { Metadata } from 'next'
import ContactForm from './contact-form'
export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with the AttendX team. Have a question, found a bug, or need help? Send us a message and we will get back to you.',
  alternates: {
    canonical: '/contact',
  },
}

export default function ContactPage() {
  return <ContactForm />
}