'use client'

// AttendX — lightweight polling hook for live-ish UI updates.
// Polls a callback on a fixed interval, pauses while the tab is hidden,
// and refreshes immediately when the tab becomes visible again.
// Overlapping runs are skipped and the interval is cleaned up on unmount.
import { useEffect, useRef } from 'react'

export function usePolling(callback: () => void | Promise<void>, intervalMs = 5000) {
  const callbackRef = useRef(callback)
  const inFlightRef = useRef(false)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const run = async () => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      try {
        await callbackRef.current()
      } catch {
        // Polls must never surface unhandled rejections; individual callbacks
        // own their error handling (e.g. showing a retry state).
      } finally {
        inFlightRef.current = false
      }
    }

    const stop = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop()
      } else {
        run()
        if (!timer) timer = setInterval(run, intervalMs)
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    if (!document.hidden) {
      timer = setInterval(run, intervalMs)
    }
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [intervalMs])
}
