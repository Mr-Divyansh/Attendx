'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  Cable,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CloudUpload,
  Download,
  FileSpreadsheet,
  History,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unplug,
} from 'lucide-react'
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

type CompanionStatus = {
  devices: Array<{ id: string; name: string; status: string; lastSeenAt: string | null; pairedAt: string }>
  jobs: Array<{ id: string; type: string; status: string; errorCode: string | null; errorMessage: string | null; queuedAt: string; startedAt: string | null; completedAt: string | null }>
}

export function PortalSyncPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [records, setRecords] = useState<StoredImport[]>([])
  const [pending, setPending] = useState<{ records: ImportedRecord[]; skipped: number; duplicates: number; conflicts: number; fileName: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [portalStatus, setPortalStatus] = useState<PortalStatusResponse | null>(null)
  const [companion, setCompanion] = useState<CompanionStatus | null>(null)
  const [pairCode, setPairCode] = useState<{ code: string; expiresAt: string } | null>(null)

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
      try {
        setCompanion(await apiFetch<CompanionStatus>('/api/student/portal/companion'))
      } catch {
        setCompanion(null)
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
    if (pending.conflicts > 0) {
      toast.error('Conflicting attendance statuses found. Resolve them in the CSV before saving.')
      return
    }
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
      await apiFetch('/api/student/portal/data', { method: 'DELETE' })
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
      if (!portalStatus?.adapter.available) {
        const result = await apiFetch<{ ok: boolean; code: string; expiresAt: string }>('/api/student/portal/companion', { method: 'POST' })
        setPairCode({ code: result.code, expiresAt: result.expiresAt })
        toast.success('Pairing code created. Run the local companion and enter this code.')
        await loadImport()
        return
      }
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
      if (!portalStatus?.adapter.available) {
        if (!companion?.devices.length) {
          toast.info('Pair the local companion before requesting attendance data.')
          return
        }
        await apiFetch('/api/student/portal/companion/job', {
          method: 'POST',
          body: JSON.stringify({ type: 'SYNC' }),
        })
        toast.success('Sync job queued for the local companion.')
        await loadImport()
        return
      }
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

  async function openLocalLogin() {
    if (!companion?.devices.length) {
      toast.info('Pair the local companion first.')
      return
    }
    setBusy(true)
    try {
      await apiFetch('/api/student/portal/companion/job', {
        method: 'POST',
        body: JSON.stringify({ type: 'OPEN_LOGIN' }),
      })
      toast.success('Browser login job sent to the local companion.')
      await loadImport()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start the local browser.')
    } finally {
      setBusy(false)
    }
  }

  async function clearLocalSession() {
    if (!companion?.devices.length) {
      toast.info('No local companion session is paired.')
      return
    }
    if (!window.confirm('Clear the dedicated local Scholars24 browser profile on this device?')) return
    setBusy(true)
    try {
      await apiFetch('/api/student/portal/companion/job', {
        method: 'POST',
        body: JSON.stringify({ type: 'CLEAR_SESSION' }),
      })
      toast.success('Local browser session clear requested.')
      await loadImport()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not clear the local session.')
    } finally {
      setBusy(false)
    }
  }

  async function disconnectCompanion() {
    if (!window.confirm('Disconnect this AttendX account from its local Scholars24 companion?')) return
    setBusy(true)
    try {
      await apiFetch('/api/student/portal/companion/disconnect', { method: 'POST' })
      setPairCode(null)
      toast.success('Local companion disconnected.')
      await loadImport()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not disconnect the companion.')
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
    <div className="page-enter space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-[linear-gradient(135deg,oklch(0.98_0.01_262)_0%,oklch(0.96_0.025_262)_58%,oklch(0.94_0.035_235)_100%)] p-5 shadow-sm dark:bg-[linear-gradient(135deg,oklch(0.22_0.025_262)_0%,oklch(0.19_0.035_262)_58%,oklch(0.17_0.04_235)_100%)] sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/3 size-32 rounded-full bg-sky-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="gap-1.5 border-primary/20 bg-primary/10 text-primary" variant="outline">
                <Cable className="size-3.5" /> Scholars24
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <ShieldCheck className="size-3.5" /> External data, isolated
              </Badge>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/75">Portal workspace</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Your college attendance, in one secure place</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Import an official report or retry Scholars24 sync. External records stay separate from teacher-marked AttendX attendance.
            </p>
          </div>
          <Button variant="outline" asChild className="w-full bg-background/70 backdrop-blur sm:w-auto">
            <a href={PORTAL_URL} target="_blank" rel="noreferrer">
              Open official portal <ArrowUpRight className="ml-2 size-4" />
            </a>
          </Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="size-4" /></span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Overall</span>
          </div>
          <p className="mt-4 text-3xl font-semibold tabular-nums">{records.length ? `${percentage}%` : '—'}</p>
          <p className="mt-1 text-xs text-muted-foreground">{attended} attended / {records.length} records</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-chart-1/10 text-chart-1"><CalendarDays className="size-4" /></span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Subjects</span>
          </div>
          <p className="mt-4 text-3xl font-semibold tabular-nums">{summaries.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Imported subject summaries</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600"><Clock3 className="size-4" /></span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last update</span>
          </div>
          <p className="mt-4 text-base font-semibold">
            {portalStatus?.connection.lastSuccessfulSyncAt
              ? new Date(portalStatus.connection.lastSuccessfulSyncAt).toLocaleDateString()
              : updatedAt
                ? new Date(updatedAt).toLocaleDateString()
                : 'No sync yet'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {portalStatus?.connection.lastSuccessfulSyncAt || updatedAt
              ? new Date(portalStatus?.connection.lastSuccessfulSyncAt ?? updatedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'CSV or live data'}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/15 shadow-sm">
        <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
          <div className="flex items-start gap-4">
            <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${portalStatus?.adapter.available ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
              {portalStatus?.adapter.available ? <CheckCircle2 className="size-6" /> : <CircleAlert className="size-6" />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">
                  {portalStatus?.connection.status === 'CSV_ACTIVE'
                    ? 'CSV fallback active'
                    : portalStatus?.connection.status === 'READY'
                      ? 'Authorized API ready'
                      : portalStatus?.connection.status === 'DISCONNECTED'
                        ? 'Disconnected'
                        : portalStatus?.connection.status === 'LOGIN_PENDING'
                          ? 'Login required in local browser'
                          : portalStatus?.connection.status === 'LOGIN_REQUIRED'
                            ? 'Local browser session expired'
                            : 'Live synchronization unavailable'}
                </p>
                <Badge variant={portalStatus?.adapter.available ? 'default' : 'secondary'} className="text-[11px]">
                  {portalStatus?.adapter.available ? 'Configured' : 'Authorization required'}
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
                {portalStatus?.adapter.message ?? 'Scholars24 live authorization is pending an approved student API or OAuth grant.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {portalStatus?.adapter.available ? (
              <Button variant="outline" onClick={connectPortal} disabled={busy || loading}><Cable className="mr-2 size-4" />Connect Scholars24</Button>
            ) : (
              <Button variant="outline" onClick={connectPortal} disabled={busy || loading}><Cable className="mr-2 size-4" />{companion?.devices.length ? 'Pair Another Device' : 'Connect Scholars24'}</Button>
            )}
            {!portalStatus?.adapter.available && companion?.devices.length ? (
              <Button variant="outline" onClick={openLocalLogin} disabled={busy || loading}><Cable className="mr-2 size-4" />Start Local Browser</Button>
            ) : null}
            <Button onClick={syncPortal} disabled={busy || loading || (!portalStatus?.adapter.available && !companion?.devices.length)}>
              {busy ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
              {busy ? 'Checking…' : 'Get Attendance Data'}
            </Button>
            {!portalStatus?.adapter.available && companion?.devices.length ? (
              <>
                <Button variant="ghost" onClick={clearLocalSession} disabled={busy}>Clear Local Session</Button>
                <Button variant="ghost" onClick={disconnectCompanion} disabled={busy}><Unplug className="mr-2 size-4" />Disconnect Device</Button>
              </>
            ) : null}
            {(portalStatus?.connection.status === 'READY' || portalStatus?.connection.status === 'DISCONNECTED') && (
              <Button variant="ghost" onClick={disconnectPortal} disabled={busy}><Unplug className="mr-2 size-4" />Disconnect</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {(pairCode || companion?.devices.length) && (
        <Card className="border-primary/15">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base">Local Companion</CardTitle>
            <CardDescription>Windows companion pairing and browser-session state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {pairCode && (
              <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pairing code</p>
                  <p className="mt-1 text-3xl font-semibold tracking-[0.18em] tabular-nums">{pairCode.code}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Expires {new Date(pairCode.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <p className="max-w-sm text-sm text-muted-foreground">Run <code className="rounded bg-background px-1.5 py-0.5 text-xs">npm run companion:pair</code>, enter this code, then run <code className="rounded bg-background px-1.5 py-0.5 text-xs">npm run companion:start</code>.</p>
              </div>
            )}
            {companion?.devices.map((device) => (
              <div key={device.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{device.name}</p>
                  <p className="text-xs text-muted-foreground">Paired {new Date(device.pairedAt).toLocaleString()}</p>
                </div>
                <div className="text-left sm:text-right">
                  <Badge variant={device.status === 'CONNECTED' ? 'default' : 'secondary'}>{device.status}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{device.lastSeenAt ? `Last seen ${new Date(device.lastSeenAt).toLocaleString()}` : 'Never contacted AttendX'}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-base"><span className="grid size-8 place-items-center rounded-lg bg-primary/10"><FileSpreadsheet className="size-4 text-primary" /></span>Attendance import</CardTitle>
          <CardDescription>
            CSV backup is available now. Sign in on the official Scholars24 site; never enter your college password into an unverified third-party form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/25 bg-[linear-gradient(135deg,transparent,oklch(0.52_0.17_262/0.035))] px-5 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.035]">
            <span className="grid size-12 place-items-center rounded-2xl border bg-background shadow-sm transition-transform group-hover:-translate-y-0.5">
              <CloudUpload className="size-5 text-primary" />
            </span>
            <div>
              <p className="font-medium">Choose an attendance report</p>
              <p className="mt-1 text-sm text-muted-foreground">Subject, Date and Status · CSV · 3 MB maximum</p>
            </div>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileChange} aria-label="Choose attendance CSV" />
            <Button onClick={() => inputRef.current?.click()} disabled={busy || loading}>
              {busy ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <CloudUpload className="mr-2 size-4" />}
              Choose CSV file
            </Button>
          </div>

          {pending && (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div>
                <p className="font-medium">Review before saving · {pending.fileName}</p>
                <p className="text-sm text-muted-foreground">{pending.records.length} valid rows · {pending.skipped} invalid rows · {pending.duplicates} duplicates ignored</p>
                {pending.conflicts > 0 && (
                  <p className="text-sm font-medium text-destructive">
                    {pending.conflicts} conflicting status {pending.conflicts === 1 ? 'row found' : 'rows found'}. This import cannot be saved until the CSV has one status per subject and date.
                  </p>
                )}
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
                <Button onClick={saveImport} disabled={busy || pending.conflicts > 0}>Save to my AttendX account</Button>
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
              <Button variant="ghost" size="sm" onClick={clearImport} disabled={busy}><Trash2 className="mr-2 size-4" /> Clear</Button>
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
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-base"><span className="grid size-8 place-items-center rounded-lg bg-primary/10"><History className="size-4 text-primary" /></span>Sync history</CardTitle>
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
