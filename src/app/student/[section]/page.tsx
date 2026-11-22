import { notFound, redirect } from 'next/navigation'
import { StudentDashboard } from '@/components/modules/student-dashboard'

const STUDENT_SECTIONS = [
  'classrooms',
  'subjects',
  'weekly',
  'monthly',
  'portal-sync',
] as const

type StudentSection = (typeof STUDENT_SECTIONS)[number]

export default async function StudentSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params

  if (section === 'overview') {
    redirect('/student')
  }

  if (!STUDENT_SECTIONS.includes(section as StudentSection)) {
    notFound()
  }

  return <StudentDashboard page={section} />
}
