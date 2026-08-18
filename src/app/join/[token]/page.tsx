import type { Metadata } from 'next'
import JoinClassroomClient from './join-client'

export const metadata: Metadata = {
  title: 'Join Classroom',
  description:
    'Join a classroom with a join code from your teacher. Enter the code to request membership and start tracking your attendance.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function JoinClassroomPage() {
  return <JoinClassroomClient />
}