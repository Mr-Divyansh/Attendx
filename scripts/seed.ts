// AttendX — Seed script
// Creates demo data: departments, semesters, sections, subjects, admin/teacher/student,
// timetable, attendance records, plus a personal-mode user with timetable & attendance.
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const PERIODS = [
  { period: 1, start: '09:00', end: '10:00' },
  { period: 2, start: '10:00', end: '11:00' },
  { period: 3, start: '11:30', end: '12:30' },
  { period: 4, start: '14:00', end: '15:00' },
]

function dateOffset(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

async function main() {
  console.log('🌱 Seeding AttendX database...')

  // ── Departments ──
  const cs = await db.department.create({ data: { name: 'Computer Science', code: 'CS' } })
  const ec = await db.department.create({ data: { name: 'Electronics', code: 'EC' } })

  // ── Semesters ──
  const sem1 = await db.semester.create({ data: { name: 'Semester 1', number: 1 } })
  const sem3 = await db.semester.create({ data: { name: 'Semester 3', number: 3 } })

  // ── Sections ──
  const secA = await db.section.create({ data: { name: 'Section A', semesterId: sem3.id } })
  const secB = await db.section.create({ data: { name: 'Section B', semesterId: sem3.id } })

  // ── Admin ──
  await db.user.create({
    data: {
      email: 'admin@attendx.edu',
      passwordHash: hashPassword('admin123'),
      role: 'ADMIN',
      admin: { create: { fullName: 'System Admin', perms: 'all' } },
    },
  })

  // ── Teachers ──
  const t1User = await db.user.create({
    data: {
      email: 'rao@attendx.edu',
      passwordHash: hashPassword('teacher123'),
      role: 'TEACHER',
      teacher: { create: { fullName: 'Prof. Rao', deptId: cs.id } },
    },
    include: { teacher: true },
  })
  const t2User = await db.user.create({
    data: {
      email: 'iyer@attendx.edu',
      passwordHash: hashPassword('teacher123'),
      role: 'TEACHER',
      teacher: { create: { fullName: 'Prof. Iyer', deptId: cs.id } },
    },
    include: { teacher: true },
  })
  const t3User = await db.user.create({
    data: {
      email: 'khan@attendx.edu',
      passwordHash: hashPassword('teacher123'),
      role: 'TEACHER',
      teacher: { create: { fullName: 'Prof. Khan', deptId: ec.id } },
    },
    include: { teacher: true },
  })

  const t1 = t1User.teacher!
  const t2 = t2User.teacher!
  const t3 = t3User.teacher!

  // ── Subjects (Semester 3, Section B) ──
  const subjC = await db.subject.create({
    data: { code: 'CS201', name: 'Programming in C', semesterId: sem3.id, sectionId: secB.id, deptId: cs.id, teacherId: t1.id },
  })
  const subjMath = await db.subject.create({
    data: { code: 'MA201', name: 'Math', semesterId: sem3.id, sectionId: secB.id, deptId: cs.id, teacherId: t2.id },
  })
  const subjComm = await db.subject.create({
    data: { code: 'HU201', name: 'Communication Skills', semesterId: sem3.id, sectionId: secB.id, deptId: cs.id, teacherId: t1.id },
  })
  const subjCoa = await db.subject.create({
    data: { code: 'EC201', name: 'COA', semesterId: sem3.id, sectionId: secB.id, deptId: ec.id, teacherId: t3.id },
  })

  // ── Students (Section B, Sem 3) — 8 students ──
  const studentNames = [
    'Aarav Sharma', 'Diya Patel', 'Kabir Singh', 'Ananya Reddy',
    'Vivaan Gupta', 'Ishaan Verma', 'Saanvi Nair', 'Arjun Mehta',
  ]
  const students: Array<{ id: string; rollNo: string }> = []
  for (let i = 0; i < studentNames.length; i++) {
    const sUser = await db.user.create({
      data: {
        email: `student${i + 1}@attendx.edu`,
        passwordHash: hashPassword('student123'),
        role: 'STUDENT',
        student: {
          create: {
            fullName: studentNames[i],
            rollNo: String(i + 1).padStart(2, '0'),
            semesterId: sem3.id,
            sectionId: secB.id,
          },
        },
      },
      include: { student: true },
    })
    const createdStudent = sUser.student!
    students.push({ id: createdStudent.id, rollNo: createdStudent.rollNo })
  }

  // ── Timetable for Section B ──
  const ttMap: Record<string, string[]> = {
    Mon: [subjC.id, subjMath.id, subjComm.id, subjCoa.id],
    Tue: [subjMath.id, subjC.id, subjCoa.id, subjComm.id],
    Wed: [subjC.id, subjCoa.id, subjMath.id, subjComm.id],
    Thu: [subjComm.id, subjMath.id, subjC.id, subjCoa.id],
    Fri: [subjC.id, subjMath.id, subjComm.id, subjCoa.id],
  }
  const subjectTeacher: Record<string, string> = {
    [subjC.id]: t1.id,
    [subjMath.id]: t2.id,
    [subjComm.id]: t1.id,
    [subjCoa.id]: t3.id,
  }
  const subjectRoom: Record<string, string> = {
    [subjC.id]: 'Room 201',
    [subjMath.id]: 'Room 105',
    [subjComm.id]: 'Room 308',
    [subjCoa.id]: 'Room 112',
  }
  const ttCreates: Array<ReturnType<typeof db.timetable.create>> = []
  for (const day of DAYS) {
    ttMap[day].forEach((subjId, idx) => {
      const p = PERIODS[idx]
      ttCreates.push(db.timetable.create({
        data: {
          sectionId: secB.id,
          subjectId: subjId,
          teacherId: subjectTeacher[subjId],
          day,
          period: p.period,
          startTime: p.start,
          endTime: p.end,
          room: subjectRoom[subjId],
        },
      }))
    })
  }
  await Promise.all(ttCreates)

  // ── Attendance records (last 20 weekdays, all students) ──
  const attCreates: Array<ReturnType<typeof db.attendance.create>> = []
  for (const stu of students) {
    for (let d = 0; d < 20; d++) {
      const dateStr = dateOffset(d)
      const dow = new Date(dateStr).getDay()
      if (dow === 0 || dow === 6) continue
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow]
      const slots = ttMap[dayName]
      if (!slots) continue
      slots.forEach((subjId, idx) => {
        const bias = stu.rollNo === '01' ? 0.84 : 0.74 + Math.random() * 0.18
        const r = Math.random()
        const status = r < bias ? 'present' : r < bias + 0.12 ? 'late' : 'absent'
        attCreates.push(db.attendance.create({
          data: {
            studentId: stu.id,
            subjectId: subjId,
            date: dateStr,
            period: PERIODS[idx].period,
            status,
            markedById: subjectTeacher[subjId],
          },
        }))
      })
    }
  }
  await Promise.all(attCreates)

  // ── Personal-mode user ──
  const pu = await db.personalUser.create({
    data: {
      fullName: 'Riya Kapoor',
      username: 'riya',
      passwordHash: hashPassword('personal123'),
      settings: { create: { darkMode: false, language: 'en', goalPct: 90 } },
    },
  })

  const pSubj = [
    { name: 'Programming in C', room: 'Room 201', teacher: 'Prof. Rao' },
    { name: 'Math', room: 'Room 105', teacher: 'Prof. Iyer' },
    { name: 'Communication Skills', room: 'Room 308', teacher: '' },
    { name: 'COA', room: 'Room 112', teacher: 'Prof. Khan' },
  ]
  const pttCreates: Array<ReturnType<typeof db.personalTimetable.create>> = []
  for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
    pSubj.forEach((s, idx) => {
      pttCreates.push(db.personalTimetable.create({
        data: {
          userId: pu.id,
          day,
          period: PERIODS[idx].period,
          startTime: PERIODS[idx].start,
          endTime: PERIODS[idx].end,
          subjectName: s.name,
          room: s.room,
          teacher: s.teacher,
        },
      }))
    })
  }
  await Promise.all(pttCreates)

  const pattCreates: Array<ReturnType<typeof db.personalAttendance.create>> = []
  for (let d = 0; d < 14; d++) {
    const dateStr = dateOffset(d)
    const dow = new Date(dateStr).getDay()
    if (dow === 0 || dow === 6) continue
    pSubj.forEach((s, idx) => {
      const bias = 0.86
      const status = Math.random() < bias ? 'present' : 'absent'
      pattCreates.push(db.personalAttendance.create({
        data: {
          userId: pu.id,
          date: dateStr,
          period: PERIODS[idx].period,
          status,
          subjectName: s.name,
        },
      }))
    })
  }
  await Promise.all(pattCreates)

  await db.notification.create({
    data: {
      userId: pu.id,
      type: 'below_target',
      message: 'Your attendance is below your 90% goal. Keep attending!',
      isRead: false,
    },
  })

  console.log('✅ Seed complete.')
  console.log('   Admin:    admin@attendx.edu / admin123')
  console.log('   Teacher:  rao@attendx.edu / teacher123')
  console.log('   Student:  student1@attendx.edu / student123')
  console.log('   Personal: riya / personal123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
