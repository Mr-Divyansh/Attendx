'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Cable, CheckCircle2, CircleAlert, CloudUpload, Download, FileSpreadsheet, RefreshCw, Trash2, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { parseAttendanceCsv, type ImportedRecord } from '@/lib/portal-csv'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const PORTAL_URL = 'https://portal-hd.scholars24.in/Student/Student/StudentView'

type StoredImport = {
  id: string
  subject: string
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  source: string
  importedAt: string
}

type ImportResponse = { import: { id: string; source: string; updatedAt: string; records: StoredImport[] } | null }
type PortalStatusResponse = {
  connection: {
    status: string
    lastSuccessfulSyncAt: string | null
    errorMessage: string | null
  }
  adapter: { available: boolean; message: string }
  history: Array<{
    id: string
    syncType: string
    status: string
    source: string
    startedAt: string
    errorMessage: string | null
  }>
}

export function PortalSyncPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [records, setRecords] = useState<StoredImport[]>([])
  const [pending, setPending] = useState<{ records: ImportedRecord[]; skipped: number; duplicates: number; fileName: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [portalStatus, setPortalStatus] = useState<PortalStatusResponse | null>(null)

  const loadImport = useCallback(async () => {
    setLoading(true)
    try {
      const result = await apiFetch<ImportResponse>('/api/student/portal-import')
      setRecords(result.import?.records ?? [])
      setUpdatedAt(result.import?.updatedAt ?? null)
      try {
        setPortalStatus(await apiFetch<PortalStatusResponse>('/api/student/portal'))
      } catch {
        setPortalStatus(null)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load imported attendance.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadImport() }, [loadImport])

  const summaries = useMemo(() => {
    const grouped = new Map<string, { subject: string; total: number; attended: number }>()
    for (const record of records) {
      const key = record.subject.trim().toLocaleLowerCase()
      const summary = grouped.get(key) ?? { subject: record.subject, total: 0, attended: 0 }
      summary.total += 1
      if (record.status !== 'ABSENT') summary.attended += 1
      grouped.set(key, summary)
    }
    return [...grouped.values()]
      .map((item) => ({ ...item, percentage: Math.round((item.attended / item.total) * 100) }))
      .sort((a, b) => a.subject.localeCompare(b.subject))
  }, [records])

  const attended = records.filter((record) => record.status !== 'ABSENT').length
  const percentage = records.length ? Math.round((attended / records.length) * 100) : 0

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      if (file.size > 3 * 1024 * 1024) throw new Error('Choose a CSV file smaller than 3 MB.')
      if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Please select a .csv file.')
      setBusy(true)
      const parsed = parseAttendanceCsv(await file.text(), file.name)
      setPending({ ...parsed, fileName: file.name })
      toast.success('CSV validated. Review the preview before saving.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to read this CSV.')
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  async function saveImport() {
    if (!pending) return
    setBusy(true)
    try {
      const result = await apiFetch<{ imported: number; updatedAt: string }>('/api/student/portal-import', {
        method: 'POST',
        body: JSON.stringify({ source: 'CSV', records: pending.records }),
      })
      setRecords(pending.records.map((record, index) => ({
        id: record.id || String(index),
        subject: record.subject,
        date: record.date,
        status: record.status,
        source: record.source,
        importedAt: record.importedAt,
      })))
      setUpdatedAt(result.updatedAt)
      setPending(null)
      toast.success(result.imported + ' attendance rows saved to your AttendX account.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save attendance.')
    } finally {
      setBusy(false)
    }
  }

  async function clearImport() {
    if (!window.confirm('Delete only your external portal-imported attendance? Official AttendX classroom attendance will not change.')) return
    setBusy(true)
    try {
      await apiFetch('/api/student/portal-import', { method: 'DELETE' })
      setRecords([])
      setUpdatedAt(null)
      setPending(null)
      toast.success('External portal import deleted.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete imported attendance.')
    } finally {
      setBusy(false)
    }
  }

  async function connectPortal() {
    setBusy(true)
    try {
      await apiFetch('/api/student/portal', { method: 'POST' })
      toast.info('Live sync is not configured. The CSV fallback remains available.')
      await loadImport()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not check Scholars24 connection.')
    } finally {
      setBusy(false)
    }
  }

  async function syncPortal() {
    setBusy(true)
    try {
      await apiFetch('/api/student/portal/sync', { method: 'POST' })
    } catch (error) {
      toast.info(error instanceof Error ? error.message : 'Live Scholars24 sync is unavailable.')
      await loadImport()
    } finally {
      setBusy(false)
    }
  }

  async function disconnectPortal() {
    if (!window.confirm('Disconnect Scholars24 and keep currently imported attendance?')) return
    setBusy(true)
    try {
      await apiFetch('/api/student/portal', { method: 'DELETE' })
      toast.success('Scholars24 marked as disconnected.')
      await loadImport()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not disconnect Scholars24.')
    } finally {
      setBusy(false)
    }
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Scholars24 · External portal</Badge>
            <Badge variant="secondary">Separate attendance data</Badge>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Scholars24 attendance sync</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Keep an independent, account-backed copy of your external attendance in AttendX.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={PORTAL_URL} target="_blank" rel="noreferrer">Open Scholars24 <ArrowUpRight className="ml-2 size-4" /></a>
        </Button>
      </div>

      <Card className="border-primary/20">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
              {portalStatus?.adapter.available ? <CheckCircle2 className="size-5" /> : <CircleAlert className="size-5" />}
            </span>
            <div>
              <p className="font-medium">
                {portalStatus?.connection.status === 'CSV_ACTIVE'
                  ? 'CSV fallback active'
                  : portalStatus?.connection.status === 'READY'
                    ? 'Authorized API ready'
                    : 'Automatic sync not configured'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {portalStatus?.adapter.message ?? 'Scholars24 live authorization is pending an approved student API or OAuth grant.'}
              </p>
              {portalStatus?.connection.lastSuccessfulSyncAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last successful sync: {new Date(portalStatus.connection.lastSuccessfulSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={connectPortal} disabled={busy || loading}><Cable className="mr-2 size-4" />Connect</Button>
            <Button onClick={syncPortal} disabled={busy || loading}>
              {busy ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}Sync now
            </Button>
            {portalStatus?.connection.status !== 'NOT_CONFIGURED' && (
              <Button variant="ghost" onClick={disconnectPortal} disabled={busy}><Unplug className="mr-2 size-4" />Disconnect</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="size-4 text-primary" /> Attendance import</CardTitle>
          <CardDescription>
            CSV backup is available now. Sign in on the official Scholars24 site; never enter your college password into an unverified third-party form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-dashed bg-muted/30 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-medium">Import an attendance CSV</p>
              <p className="mt-1 text-sm text-muted-foreground">Required columns: Subject, Date and Status (Present, Absent or Late). Maximum 3 MB.</p>
            </div>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileChange} aria-label="Choose attendance CSV" />
            <Button onClick={() => inputRef.current?.click()} disabled={busy || loading}>
              {busy ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <CloudUpload className="mr-2 size-4" />}
              Choose CSV
            </Button>
          </div>

          {pending && (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div>
                <p className="font-medium">Review before saving · {pending.fileName}</p>
                <p className="text-sm text-muted-foreground">{pending.records.length} valid rows · {pending.skipped} invalid rows · {pending.duplicates} duplicates ignored</p>
              </div>
              <div className="max-h-44 overflow-auto rounded-lg border bg-background">
                {pending.records.slice(0, 8).map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-3 border-b px-3 py-2 text-sm last:border-0">
                    <span className="min-w-0 truncate">{record.subject} · {record.date}</span>
                    <Badge variant="outline">{record.status}</Badge>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveImport} disabled={busy}>Save to my AttendX account</Button>
                <Button variant="outline" onClick={() => setPending(null)} disabled={busy}>Cancel</Button>
              </div>
              <p className="text-xs text-muted-foreground">Saving replaces only your previous external portal import. Teacher-marked AttendX attendance is never modified.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Imported attendance</CardTitle>
              <CardDescription>
                {updatedAt ? 'Last saved ' + new Date(updatedAt).toLocaleString() : 'No external attendance has been saved yet.'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportJson} disabled={!records.length}><Download className="mr-2 size-4" /> Export JSON</Button>
              <Button variant="ghost" size="sm" onClick={clearImport} disabled={!records.length || busy}><Trash2 className="mr-2 size-4" /> Clear</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading your saved portal attendance…</p>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center">
              <FileSpreadsheet className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No imported records yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Your imported records will be saved to your account and available across devices.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Overall</p><p className="mt-1 text-2xl font-semibold tabular-nums">{percentage}%</p></div>
                <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Attended</p><p className="mt-1 text-2xl font-semibold tabular-nums">{attended} / {records.length}</p></div>
                <div className="col-span-2 rounded-xl bg-muted/50 p-3 sm:col-span-1"><p className="text-xs text-muted-foreground">Subjects</p><p className="mt-1 text-2xl font-semibold tabular-nums">{summaries.length}</p></div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {summaries.map((item) => (
                  <div key={item.subject} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-medium">{item.subject}</p><p className="mt-1 text-xs text-muted-foreground">{item.attended} attended of {item.total}</p></div>
                      <Badge variant={item.percentage >= 75 ? 'default' : 'secondary'}>{item.percentage}%</Badge>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: item.percentage + '%' }} /></div>
                  </div>
                ))}
              </div>
              <div className="overflow-hidden rounded-xl border">
                <div className="border-b bg-muted/40 px-4 py-3 text-sm font-medium">Recent imported records</div>
                <div className="max-h-72 overflow-auto">
                  {records.slice(0, 20).map((record) => (
                    <div key={record.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0">
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{record.subject}</p><p className="text-xs text-muted-foreground">{record.date} · {record.source}</p></div>
                      <Badge variant="outline" className={record.status === 'ABSENT' ? 'border-red-500/30 text-red-600' : record.status === 'LATE' ? 'border-amber-500/30 text-amber-600' : 'border-emerald-500/30 text-emerald-600'}>{record.status === 'PRESENT' ? <CheckCircle2 className="mr-1 size-3" /> : null}{record.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {portalStatus?.history && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync history</CardTitle>
            <CardDescription>Recent CSV and Scholars24 synchronization attempts.</CardDescription>
          </CardHeader>
          <CardContent>
            {portalStatus.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No synchronization attempts yet.</p>
            ) : (
              <div className="space-y-2">
                {portalStatus.history.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.syncType} · {item.source}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.startedAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={item.status === 'SUCCESS' ? 'default' : 'secondary'}>{item.status}</Badge>
                      {item.errorMessage && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{item.errorMessage}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
