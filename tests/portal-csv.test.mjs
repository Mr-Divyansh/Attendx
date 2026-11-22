import test from 'node:test'
import assert from 'node:assert/strict'
import { parseAttendanceCsv } from '../src/lib/portal-csv.ts'

test('parses BOM, quoted commas, quoted newlines, aliases and Indian/ISO dates', () => {
  const csv = '\uFEFFSubject,Date,Status\r\n"Data, Structures",22/11/2026,Present\r\n"Computer\nArchitecture",2026-11-21,Late'
  const result = parseAttendanceCsv(csv, 'attendance.csv')

  assert.equal(result.records.length, 2)
  assert.equal(result.records[0].subject, 'Data, Structures')
  assert.equal(result.records[0].date, '2026-11-22')
  assert.equal(result.records[0].status, 'PRESENT')
  assert.equal(result.records[1].subject, 'Computer\nArchitecture')
  assert.equal(result.records[1].status, 'LATE')
  assert.equal(result.skipped, 0)
})

test('skips invalid dates and ignores exact duplicate attendance rows', () => {
  const csv = [
    'Subject,Date,Status',
    'Mathematics,01-11-2026,Present',
    ' mathematics ,01-11-2026,P',
    'Physics,31-02-2026,Absent',
  ].join('\n')
  const result = parseAttendanceCsv(csv, 'attendance.csv')

  assert.equal(result.records.length, 1)
  assert.equal(result.duplicates, 1)
  assert.equal(result.skipped, 1)
})

test('rejects malformed quoted CSV', () => {
  assert.throws(
    () => parseAttendanceCsv('Subject,Date,Status\n"Mathematics,22-11-2026,Present', 'broken.csv'),
    /unclosed quoted field/i,
  )
})

test('rejects CSV without required columns', () => {
  assert.throws(
    () => parseAttendanceCsv('Name,Day\nA,Monday', 'wrong.csv'),
    /could not find subject, date and status/i,
  )
})

test('reports conflicting statuses for the same subject and date', () => {
  const csv = [
    'Subject,Date,Status',
    'Mathematics,23-11-2026,Present',
    ' mathematics ,2026-11-23,Absent',
  ].join('\n')
  const result = parseAttendanceCsv(csv, 'conflict.csv')

  assert.equal(result.records.length, 1)
  assert.equal(result.conflicts, 1)
})
