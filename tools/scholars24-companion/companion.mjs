import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { chromium } from 'playwright'

const SERVER_URL = (process.env.ATTENDX_COMPANION_SERVER_URL || 'https://attendx-ashy.vercel.app').replace(/\/$/, '')
const STATE_DIR = path.join(os.homedir(), '.attendx')
const CONFIG_FILE = path.join(STATE_DIR, 'scholars24-companion.json')
const PROFILE_DIR = path.join(STATE_DIR, 'scholars24-browser-profile')
const PORTAL_URL = 'https://portal-hd.scholars24.in/Student/Student/StudentView'

async function ensureStateDir() {
  await fs.mkdir(STATE_DIR, { recursive: true, mode: 0o700 })
}

async function loadConfig() {
  await ensureStateDir()
  try {
    return JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8'))
  } catch {
    return null
  }
}

async function saveConfig(config) {
  await ensureStateDir()
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 })
  if (process.platform !== 'win32') await fs.chmod(CONFIG_FILE, 0o600)
}

function headers(config = null) {
  const value = {
    'content-type': 'application/json',
    'x-attendx-companion': '1',
  }
  if (config) {
    value.authorization = `Bearer ${config.deviceSecret}`
    value['x-attendx-device-id'] = config.deviceId
  }
  return value
}

async function pair() {
  const rl = readline.createInterface({ input, output })
  const code = (await rl.question('Enter the 8-digit pairing code shown in AttendX: ')).trim()
  rl.close()
  if (!/^\d{8}$/.test(code)) throw new Error('The pairing code must contain exactly 8 digits.')

  const response = await fetch(`${SERVER_URL}/api/portal/companion/pair`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      code,
      deviceName: `${os.hostname()} (${process.platform})`,
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Pairing failed.')
  await saveConfig({
    deviceId: data.deviceId,
    deviceSecret: data.deviceSecret,
    serverUrl: SERVER_URL,
  })
  console.log('Paired successfully. Start the companion with: npm run companion:start')
}

async function clearSession() {
  await fs.rm(PROFILE_DIR, { recursive: true, force: true })
  console.log('Local Scholars24 browser profile cleared.')
}

function normalizeDate(value) {
  const input = String(value || '').trim()
  let year
  let month
  let day
  let match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(input)
  if (match) {
    year = Number(match[1]); month = Number(match[2]); day = Number(match[3])
  } else {
    match = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(input)
    if (!match) return null
    day = Number(match[1]); month = Number(match[2]); year = Number(match[3])
  }
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase()
  if (/^(p|present|attended|yes|1)$/.test(status)) return 'PRESENT'
  if (/^(a|absent|missed|no|0)$/.test(status)) return 'ABSENT'
  if (/^(l|late|late present)$/.test(status)) return 'LATE'
  return null
}

async function launchBrowser() {
  await fs.mkdir(PROFILE_DIR, { recursive: true, mode: 0o700 })
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 850 },
  })
}

async function openOfficialLogin(context) {
  const page = context.pages()[0] || await context.newPage()
  await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  return { page }
}

async function extractVisibleAttendance(context) {
  const page = context.pages()[0] || await context.newPage()
  await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForTimeout(2500)

  const passwordVisible = await page.locator('input[type="password"]').count()
  if (passwordVisible > 0) return { status: 'LOGIN_REQUIRED' }
  const url = page.url().toLowerCase()
  if (/(login|signin|sign-in)/.test(url)) return { status: 'LOGIN_REQUIRED' }

  const tables = await page.locator('table').evaluateAll((elements) =>
    elements.map((table) => ({
      headers: Array.from(table.querySelectorAll('thead th, thead td')).map((cell) => String(cell.textContent || '').trim()),
      rows: Array.from(table.querySelectorAll('tbody tr')).map((row) =>
        Array.from(row.querySelectorAll('th, td')).map((cell) => String(cell.textContent || '').trim())
      ),
    }))
  )

  for (const table of tables) {
    if (!table.headers.length) continue
    const normalizedHeaders = table.headers.map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ''))
    const subjectIndex = normalizedHeaders.findIndex((header) => ['subject','subjectname','course','coursename','paper'].includes(header))
    const dateIndex = normalizedHeaders.findIndex((header) => ['date','classdate','attendancedate','markedon'].includes(header))
    const statusIndex = normalizedHeaders.findIndex((header) => ['status','attendance','attendancestatus','presentabsent'].includes(header))
    if (subjectIndex < 0 || dateIndex < 0 || statusIndex < 0) continue

    const records = []
    for (const row of table.rows) {
      const subject = row[subjectIndex]
      const date = normalizeDate(row[dateIndex])
      const status = normalizeStatus(row[statusIndex])
      if (!subject || !date || !status) continue
      records.push({
        subject,
        date,
        status,
        externalKey: `visible:${date}:${subject.toLocaleLowerCase().replace(/\s+/g, ' ')}`,
      })
    }
    if (records.length) return { status: 'SUCCESS', records }
  }

  return {
    status: 'ERROR',
    errorCode: 'PORTAL_LAYOUT_UNVERIFIED',
    errorMessage: 'No verified student-visible dated attendance table was found. Aggregate-only or changed portal layouts are not imported.',
  }
}

async function completeJob(config, jobId, payload) {
  const response = await fetch(`${config.serverUrl || SERVER_URL}/api/portal/companion/complete`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({ jobId, ...payload }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Could not complete companion job.')
  return data
}

async function start() {
  const config = await loadConfig()
  if (!config?.deviceId || !config.deviceSecret) {
    throw new Error('Local companion is not paired. Run: npm run companion:pair')
  }

  let context = null
  console.log('AttendX Scholars24 local companion started.')
  console.log('No college password or browser cookie is sent to AttendX.')

  while (true) {
    try {
      const response = await fetch(`${config.serverUrl || SERVER_URL}/api/portal/companion/poll`, {
        method: 'POST',
        headers: headers(config),
        body: '{}',
      })
      const data = await response.json()
      if (response.ok && data.job) {
        const job = data.job
        if (job.type === 'OPEN_LOGIN') {
          context ||= await launchBrowser()
          await openOfficialLogin(context)
          await completeJob(config, job.id, { status: 'SUCCESS' })
        } else if (job.type === 'SYNC') {
          context ||= await launchBrowser()
          const result = await extractVisibleAttendance(context)
          if (result.status === 'LOGIN_REQUIRED') {
            await completeJob(config, job.id, { status: 'LOGIN_REQUIRED' })
          } else if (result.status === 'ERROR') {
            await completeJob(config, job.id, { status: 'ERROR', errorCode: result.errorCode, errorMessage: result.errorMessage })
          } else {
            await completeJob(config, job.id, { status: 'SUCCESS', records: result.records })
          }
        } else if (job.type === 'CLEAR_SESSION') {
          if (context) await context.close()
          context = null
          await clearSession()
          await completeJob(config, job.id, { status: 'SUCCESS' })
        }
      }
    } catch (error) {
      console.error('Companion poll failed:', error instanceof Error ? error.message : 'Unknown error')
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}

const command = process.argv[2]
try {
  if (command === 'pair') await pair()
  else if (command === 'clear') await clearSession()
  else if (command === 'start') await start()
  else console.log('Usage: npm run companion:pair | companion:start | companion:clear')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Companion command failed.')
  process.exitCode = 1
}
