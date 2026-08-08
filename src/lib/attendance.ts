import { getMinimumAttendancePercentage } from './config'

export { getMinimumAttendancePercentage, DEFAULT_MINIMUM_ATTENDANCE } from './config'

/** @deprecated Use getMinimumAttendancePercentage() for server-side code */
export const minimumAttendancePercentage = 75

export function calcAttendancePct(attended: number, total: number): number {
  if (total <= 0) return -1 // sentinel: no records yet
  return Math.round((attended / total) * 1000) / 10
}

export type AttendanceStatusLevel = 'good' | 'minimum' | 'warning' | 'none'

export function getAttendanceStatus(
  pct: number,
  threshold = minimumAttendancePercentage
): AttendanceStatusLevel {
  if (pct < 0) return 'none'
  if (pct > threshold) return 'good'
  if (pct === threshold) return 'minimum'
  return 'warning'
}

export function attendanceStatusMessage(
  pct: number,
  threshold = minimumAttendancePercentage
): { title: string; message: string; level: AttendanceStatusLevel } {
  const level = getAttendanceStatus(pct, threshold)
  switch (level) {
    case 'none':
      return {
        level,
        title: 'No attendance records yet',
        message:
          'Your attendance will appear here once classes are recorded.',
      }
    case 'good':
      return {
        level,
        title: `Attendance: ${pct}%`,
        message: 'Good attendance. Keep it up!',
      }
    case 'minimum':
      return {
        level,
        title: `Attendance: ${pct}%`,
        message:
          'You are at the minimum attendance requirement. Maintain regular attendance.',
      }
    case 'warning':
      return {
        level,
        title: 'Attendance Warning',
        message: `Your attendance is currently ${pct}%. Minimum required: ${threshold}%. You need to attend upcoming classes regularly.`,
      }
  }
}
