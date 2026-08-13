import { NextRequest } from 'next/server'
import { z } from 'zod'
import { errorResponse, handleRouteError, json } from '@/lib/auth'

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5000),
})

export async function POST(req: NextRequest) {
  try {
    const accessKey = process.env.WEB3FORMS_ACCESS_KEY?.trim()
    if (!accessKey) return errorResponse('Contact form is temporarily unavailable. Please try again later.', 503)

    const data = contactSchema.safeParse(await req.json())
    if (!data.success) return errorResponse('Please provide a valid name, email, and message.', 400)

    const form = new FormData()
    form.set('access_key', accessKey)
    form.set('subject', 'AttendX contact request')
    form.set('from_name', 'AttendX Contact Form')
    form.set('name', data.data.name)
    form.set('email', data.data.email)
    form.set('message', data.data.message)
    const response = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: form, cache: 'no-store' })
    if (!response.ok) {
      console.error('[contact] delivery failed', { status: response.status })
      return errorResponse('Unable to send your message. Please try again later.', 502)
    }
    return json({ ok: true })
  } catch (error) {
    return handleRouteError(error, 'contact')
  }
}
