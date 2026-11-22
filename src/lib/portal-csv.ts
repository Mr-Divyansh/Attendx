export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE'

export type ImportedRecord = {
  id: string
  subject: string
  date: string
  status: AttendanceStatus
  source: string
  importedAt: string
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (char === '"' && quoted && input[index + 1] === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index += 1
      row.push(cell.trim())
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (quoted) throw new Error('The CSV contains an unclosed quoted field.')
  row.push(cell.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)
  return rows
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function findColumn(headers: string[], aliases: string[]): number {
  return headers.map(normalizeHeader).findIndex((header) => aliases.includes(header))
}

function normalizeDate(value: string): string | null {
  const input = value.trim()
  if (!input) return null

  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(input)
  const indian = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(input)
  let year: number
  let month: number
  let day: number

  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
  } else if (indian) {
    day = Number(indian[1])
    month = Number(indian[2])
    year = Number(indian[3])
  } else {
    return null
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function normalizeStatus(value: string): AttendanceStatus | null {
  const status = value.trim().toLowerCase()
  if (/^(p|present|yes|true|1|attended)$/.test(status)) return 'PRESENT'
  if (/^(a|absent|no|false|0|missed)$/.test(status)) return 'ABSENT'
  if (/^(l|late|late present)$/.test(status)) return 'LATE'
  return null
}

export function parseAttendanceCsv(text: string, fileName: string): {
  records: ImportedRecord[]
  skipped: number
  duplicates: number
  conflicts: number
} {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) throw new Error('The CSV is empty or has no attendance rows.')

  const subjectAliases = ['subject', 'subjectname', 'course', 'coursename', 'paper']
  const dateAliases = ['date', 'classdate', 'attendancedate', 'markedon']
  const statusAliases = ['status', 'attendance', 'attendancestatus', 'presentabsent']
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeHeader)
    return headers.some((header) => subjectAliases.includes(header)) &&
      headers.some((header) => dateAliases.includes(header)) &&
      headers.some((header) => statusAliases.includes(header))
  })
  if (headerIndex < 0) throw new Error('Could not find Subject, Date and Status columns in this CSV.')

  const headers = rows[headerIndex]
  const subjectIndex = findColumn(headers, subjectAliases)
  const dateIndex = findColumn(headers, dateAliases)
  const statusIndex = findColumn(headers, statusAliases)
  const importedAt = new Date().toISOString()
  const records: ImportedRecord[] = []
  const seen = new Set<string>()
  const statusesBySubjectDate = new Map<string, AttendanceStatus>()
  let skipped = 0
  let duplicates = 0
  let conflicts = 0

  rows.slice(headerIndex + 1).forEach((row) => {
    const subject = row[subjectIndex]?.trim()
    const date = normalizeDate(row[dateIndex] ?? '')
    const status = normalizeStatus(row[statusIndex] ?? '')
    if (!subject || !date || !status) {
      skipped += 1
      return
    }

    const normalizedSubject = subject.trim()
    const subjectDateKey = `${normalizedSubject.toLocaleLowerCase().replace(/\s+/g, ' ')}|${date}`
    const existingStatus = statusesBySubjectDate.get(subjectDateKey)
    if (existingStatus && existingStatus !== status) {
      conflicts += 1
      return
    }
    if (existingStatus === status) {
      duplicates += 1
      return
    }
    statusesBySubjectDate.set(subjectDateKey, status)

    const duplicateKey = `${date}|${normalizedSubject.toLocaleLowerCase()}|${status}`
    if (seen.has(duplicateKey)) {
      duplicates += 1
      return
    }
    seen.add(duplicateKey)
    records.push({ id: duplicateKey, subject: normalizedSubject, date, status, source: fileName, importedAt })
  })

  if (records.length === 0) {
    throw new Error('No valid attendance rows were found. Check the CSV column names and values.')
  }
  return { records, skipped, duplicates, conflicts }
}
