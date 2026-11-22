'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Cable,
  CheckCircle2,
  CircleAlert,
  CloudUpload,
  Download,
  FileSpreadsheet,
  LockKeyhole,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { parseAttendanceCsv, type ImportedRecord } from '@/lib/portal-csv'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type SubjectSummary = {
  subject: string
  total: number
  attended: number
  percentage: number
}

const STORAGE_PREFIX = 'attendx:portal-import:v1:'
const PORTAL_ATTENDANCE_URL =
  'https://portal-hd.scholars24.in/Student/Student/StudentView'


export function PortalImportPanel({ storageKey }: { storageKey: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scopedStorageKey = STORAGE_PREFIX + encodeURIComponent(storageKey.toLowerCase())
  const [records, setRecords] = useState<ImportedRecord[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [lastImport, setLastImport] = useState<{ count: number; skipped: number; duplicates: number } | null>(null)
  const [pendingImport, setPendingImport] = useState<{ records: ImportedRecord[]; skipped: number; duplicates: number; fileName: string } | null>(null)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(scopedStorageKey)
      const parsed = saved ? (JSON.parse(saved) as ImportedRecord[]) : []
      setRecords(Array.isArray(parsed) ? parsed : [])
    } catch {
      setRecords([])
      toast.error('Saved portal data could not be read in this browser.')
    } finally {
      setLoadedKey(scopedStorageKey)
    }
  }, [scopedStorageKey])

  useEffect(() => {
    if (loadedKey !== scopedStorageKey) return
    try {
      window.localStorage.setItem(scopedStorageKey, JSON.stringify(records))
    } catch {
      toast.error('Browser storage is full. Export your data and remove older imports.')
    }
  }, [records, loadedKey, scopedStorageKey])

  const summaries = useMemo<SubjectSummary[]>(() => {
    const grouped = new Map<string, SubjectSummary>()
    for (const record of records) {
      const key = record.subject.trim().toLowerCase()
      const current = grouped.get(key) ?? {
        subject: record.subject,
        total: 0,
        attended: 0,
        percentage: 0,
      }
      current.total += 1
      if (record.status !== 'ABSENT') current.attended += 1
      current.percentage = Math.round((current.attended / current.total) * 100)
      grouped.set(key, current)
    }
    return [...grouped.values()].sort((a, b) => a.subject.localeCompare(b.subject))
  }, [records])

  const totalAttended = records.filter((record) => record.status !== 'ABSENT').length
  const overallPercentage = records.length
    ? Math.round((totalAttended / records.length) * 100)
    : 0

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Please choose a CSV file smaller than 3 MB.')
      event.target.value = ''
      return
    }

    setIsImporting(true)
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Please select a .csv file.')
      const parsed = parseAttendanceCsv(await file.text(), file.name)
      const nextRecords = [...parsed.records].sort(
        (a, b) => b.date.localeCompare(a.date) || a.subject.localeCompare(b.subject),
      )
      setPendingImport({ records: nextRecords, skipped: parsed.skipped, duplicates: parsed.duplicates, fileName: file.name })
      toast.success('CSV validated. Review the preview before replacing your imported records.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to import this CSV.')
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  function confirmImport() {
    if (!pendingImport) return
    const existingCount = records.length
    const confirmed = window.confirm(
      'Replace your existing ' + existingCount + ' portal-imported records with ' +
      pendingImport.records.length + ' records from ' + pendingImport.fileName +
      '? Teacher-marked AttendX classroom attendance will not be changed.',
    )
    if (!confirmed) return
    setRecords(pendingImport.records)
    setLastImport({ count: pendingImport.records.length, skipped: pendingImport.skipped, duplicates: pendingImport.duplicates })
    setPendingImport(null)
    toast.success(pendingImport.records.length + ' portal attendance rows replaced.')
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'attendx-portal-attendance.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function clearImports() {
    if (!window.confirm('Clear all attendance imported from external portals on this browser?')) return
    setRecords([])
    setLastImport(null)
    toast.success('Imported portal data cleared.')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <Cable className="size-3.5" /> External portal
            </Badge>
            <Badge variant="secondary">Read-only import</Badge>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Bring your college attendance into AttendX</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Import an attendance CSV exported from your student portal. Imported records stay separate from teacher-marked AttendX records.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={PORTAL_ATTENDANCE_URL} target="_blank" rel="noreferrer">
            Login to Scholars24 <ArrowUpRight className="ml-2 size-4" />
          </a>
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CloudUpload className="size-4 text-primary" /> Import attendance
              </CardTitle>
              <Badge variant="outline" className="text-muted-foreground">CSV · max 3 MB</Badge>
            </div>
            <CardDescription>
              Step 1: Sign in on the official Scholars24 portal. Step 2: download your attendance report and import its CSV here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed bg-muted/30 p-5 sm:p-7">
              <div className="mx-auto flex max-w-md flex-col items-center text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <FileSpreadsheet className="size-6" />
                </span>
                <p className="mt-3 font-medium">Choose an attendance CSV</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Required columns: Subject, Date and Status (Present, Absent or Late).
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={handleFileChange}
                  aria-label="Choose attendance CSV file"
                />
                <Button
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting || loadedKey !== scopedStorageKey}
                >
                  {isImporting ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <CloudUpload className="mr-2 size-4" />}
                  {isImporting ? 'Importing…' : 'Select CSV file'}
                </Button>
                {lastImport && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Last import: {lastImport.count} imported · {lastImport.skipped} invalid · {lastImport.duplicates} duplicates ignored
                  </p>
                )}
              </div>
            </div>
            {pendingImport && (
              <div className="mt-4 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div>
                  <p className="font-medium">Import preview</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pendingImport.records.length} valid rows · {pendingImport.skipped} invalid rows · {pendingImport.duplicates} duplicates ignored · {pendingImport.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This will replace only the portal-imported records saved in this browser.
                  </p>
                  <div className="max-h-48 overflow-auto rounded-lg border bg-background">
                    {pendingImport.records.slice(0, 8).map((record) => (
                      <div key={record.id} className="flex items-center justify-between gap-3 border-b px-3 py-2 text-sm last:border-0">
                        <div className="min-w-0"><p className="truncate font-medium">{record.subject}</p><p className="text-xs text-muted-foreground">{record.date}</p></div>
                        <Badge variant="outline">{record.status === 'PRESENT' ? 'Present' : record.status === 'ABSENT' ? 'Absent' : 'Late'}</Badge>
                      </div>
                    ))}
                  </div>
                  {pendingImport.records.length > 8 && <p className="text-xs text-muted-foreground">Showing first 8 of {pendingImport.records.length} valid rows.</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={confirmImport}>Confirm replacement</Button>
                  <Button variant="outline" onClick={() => setPendingImport(null)}>Cancel</Button>
                </div>
              </div>
            )}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <LockKeyhole className="mt-0.5 size-4 shrink-0" />
              <p>Scholars24 login opens on its official website in a new tab. Enter your login details only there. AttendX does not receive them. Your CSV is processed in this browser and saved only on this device.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cable className="size-4 text-primary" /> Automatic API connection
            </CardTitle>
            <CardDescription>
              Direct sync needs an official Scholars24 API endpoint and read-only access credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <CircleAlert className="size-4 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Not configured</p>
                <p className="text-xs text-muted-foreground">No verified API endpoint or student API key has been provided.</p>
              </div>
              <Badge variant="secondary">Pending</Badge>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>To enable automatic sync, ask your college or Scholars24 support for:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Official student attendance API documentation</li>
                <li>A read-only endpoint for your own student record</li>
                <li>An API key or OAuth method intended for student integrations</li>
              </ul>
            </div>
            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              AttendX will not ask for or store your college portal password, browser cookies or session tokens. The importer uses an official API only after its access method is verified.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Imported attendance</CardTitle>
              <CardDescription>External records are kept separate and never alter your official AttendX classroom attendance.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportJson} disabled={records.length === 0}>
                <Download className="mr-2 size-4" /> Export JSON
              </Button>
              <Button variant="ghost" size="sm" onClick={clearImports} disabled={records.length === 0}>
                <Trash2 className="mr-2 size-4" /> Clear imports
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadedKey !== scopedStorageKey ? (
            <p className="text-sm text-muted-foreground">Loading saved imports…</p>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center">
              <FileSpreadsheet className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No portal records imported yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Upload a CSV report to see subject-wise attendance here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Overall imported</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{overallPercentage}%</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Attended classes</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{totalAttended}<span className="text-sm font-normal text-muted-foreground"> / {records.length}</span></p>
                </div>
                <div className="col-span-2 rounded-xl bg-muted/50 p-3 sm:col-span-1">
                  <p className="text-xs text-muted-foreground">Subjects imported</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{summaries.length}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {summaries.map((summary) => (
                  <div key={summary.subject} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{summary.subject}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{summary.attended} attended of {summary.total} classes</p>
                      </div>
                      <Badge variant={summary.percentage >= 75 ? 'default' : 'secondary'}>{summary.percentage}%</Badge>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: summary.percentage + '%' }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-xl border">
                <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                  <p className="text-sm font-medium">Recent imported records</p>
                  <Badge variant="outline">{records.length} records</Badge>
                </div>
                <div className="max-h-72 overflow-auto">
                  {records.slice(0, 12).map((record) => (
                    <div key={record.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{record.subject}</p>
                        <p className="text-xs text-muted-foreground">{new Date(record.date + 'T00:00:00').toLocaleDateString()} · {record.source}</p>
                      </div>
                      <Badge variant="outline" className={record.status === 'ABSENT' ? 'border-red-500/30 text-red-600 dark:text-red-400' : record.status === 'LATE' ? 'border-amber-500/30 text-amber-600 dark:text-amber-400' : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'}>
                        {record.status === 'PRESENT' ? <CheckCircle2 className="mr-1 size-3" /> : null}
                        {record.status === 'LATE' ? 'Late' : record.status === 'ABSENT' ? 'Absent' : 'Present'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
