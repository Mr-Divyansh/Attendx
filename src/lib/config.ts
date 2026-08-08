import { db } from './db'

export const DEFAULT_MINIMUM_ATTENDANCE = 75

const SETTING_KEY = 'minimumAttendancePercentage'

export async function getMinimumAttendancePercentage(): Promise<number> {
  try {
    const row = await db.systemSetting.findUnique({ where: { key: SETTING_KEY } })
    if (!row) return DEFAULT_MINIMUM_ATTENDANCE
    const n = parseInt(row.value, 10)
    return Number.isFinite(n) && n > 0 && n <= 100 ? n : DEFAULT_MINIMUM_ATTENDANCE
  } catch {
    return DEFAULT_MINIMUM_ATTENDANCE
  }
}

export async function setMinimumAttendancePercentage(value: number): Promise<void> {
  const v = Math.min(100, Math.max(1, Math.round(value)))
  await db.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: String(v) },
    create: { key: SETTING_KEY, value: String(v) },
  })
}
