import { useCallback, useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import {
  ClientEvent,
  ServerEvent,
  bboxEquals,
  normaliseBbox,
  type AircraftEnrichment,
  type AircraftState,
  type Bbox,
  type DeltaPayload,
  type EnrichedPayload,
  type SnapshotPayload,
  type StatusPayload,
} from '@skytrace/shared'
import { PositionInterpolator } from '@/lib/interpolation'
import { createStreamSocket } from '@/lib/socket'

export interface TrackedAircraft {
  state: AircraftState
  enrichment: AircraftEnrichment | null
}

export interface LiveFeed {
  aircraft: Map<string, TrackedAircraft>
  interpolator: PositionInterpolator
  status: StatusPayload | null
  connected: boolean
  setViewport: (bbox: Bbox, zoom: number) => void
}

/** React state updates are coalesced to this cadence; the canvas animates independently. */
const PUBLISH_INTERVAL_MS = 250

const VIEWPORT_DEBOUNCE_MS = 300

/** Requested area is grown slightly so small pans reuse data already on the client. */
const VIEWPORT_PAD_RATIO = 0.1
const VIEWPORT_PAD_MIN_DEG = 0.25

/**
 * A hidden tab still holds a subscription, which keeps the server polling and burning
 * upstream credits. Backgrounded tabs disconnect after this long and resubscribe on return.
 */
const IDLE_DISCONNECT_MS = 30_000

function padViewport(bbox: Bbox): Bbox {
  const latPad = Math.max(VIEWPORT_PAD_MIN_DEG, (bbox.north - bbox.south) * VIEWPORT_PAD_RATIO)
  const lngPad = Math.max(VIEWPORT_PAD_MIN_DEG, (bbox.east - bbox.west) * VIEWPORT_PAD_RATIO)
  return normaliseBbox({
    south: bbox.south - latPad,
    north: bbox.north + latPad,
    west: bbox.west - lngPad,
    east: bbox.east + lngPad,
  })
}

export function useLiveAircraft(): LiveFeed {
  const [aircraft, setAircraft] = useState<Map<string, TrackedAircraft>>(() => new Map())
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [connected, setConnected] = useState(false)

  const interpolatorRef = useRef<PositionInterpolator | null>(null)
  interpolatorRef.current ??= new PositionInterpolator()
  const interpolator = interpolatorRef.current

  const socketRef = useRef<Socket | null>(null)
  const storeRef = useRef<Map<string, TrackedAircraft>>(new Map())
  const publishTimerRef = useRef<number | null>(null)

  const desiredViewportRef = useRef<{ bbox: Bbox; zoom: number } | null>(null)
  const sentViewportRef = useRef<Bbox | null>(null)
  const viewportTimerRef = useRef<number | null>(null)

  const schedulePublish = useCallback(() => {
    if (publishTimerRef.current !== null) return
    publishTimerRef.current = window.setTimeout(() => {
      publishTimerRef.current = null
      setAircraft(new Map(storeRef.current))
    }, PUBLISH_INTERVAL_MS)
  }, [])

  const sendViewport = useCallback((force = false) => {
    const socket = socketRef.current
    const desired = desiredViewportRef.current
    if (!socket || !desired) return

    const padded = padViewport(desired.bbox)
    if (!force && sentViewportRef.current && bboxEquals(sentViewportRef.current, padded, 0.05)) {
      return
    }

    sentViewportRef.current = padded
    socket.emit(ClientEvent.SetViewport, { bbox: padded, zoom: desired.zoom })
  }, [])

  const setViewport = useCallback(
    (bbox: Bbox, zoom: number) => {
      desiredViewportRef.current = { bbox, zoom }
      if (viewportTimerRef.current !== null) return

      viewportTimerRef.current = window.setTimeout(() => {
        viewportTimerRef.current = null
        sendViewport()
      }, VIEWPORT_DEBOUNCE_MS)
    },
    [sendViewport],
  )

  useEffect(() => {
    const socket = createStreamSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      // A fresh connection has no server-side viewport, so always re-announce ours.
      sendViewport(true)
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on(ServerEvent.Status, (payload: StatusPayload) => setStatus(payload))

    socket.on(ServerEvent.Snapshot, (payload: SnapshotPayload) => {
      const next = new Map<string, TrackedAircraft>()
      const keep = new Set<string>()

      for (const state of payload.aircraft) {
        // Enrichment already resolved for this airframe survives the snapshot.
        const previous = storeRef.current.get(state.icao24)
        next.set(state.icao24, { state, enrichment: previous?.enrichment ?? null })
        keep.add(state.icao24)
        interpolator.upsert(state)
      }

      storeRef.current = next
      interpolator.retain(keep)
      schedulePublish()
    })

    socket.on(ServerEvent.Delta, (payload: DeltaPayload) => {
      for (const state of payload.updated) {
        const previous = storeRef.current.get(state.icao24)
        storeRef.current.set(state.icao24, {
          state,
          enrichment: previous?.enrichment ?? null,
        })
        interpolator.upsert(state)
      }

      for (const icao24 of payload.removed) {
        storeRef.current.delete(icao24)
        interpolator.remove(icao24)
      }

      schedulePublish()
    })

    socket.on(ServerEvent.Enriched, (payload: EnrichedPayload) => {
      let changed = false
      for (const item of payload.items) {
        const existing = storeRef.current.get(item.icao24)
        if (!existing) continue
        storeRef.current.set(item.icao24, { state: existing.state, enrichment: item })
        changed = true
      }
      if (changed) schedulePublish()
    })

    let hideTimer: number | null = null
    const onVisibilityChange = () => {
      if (document.hidden) {
        hideTimer = window.setTimeout(() => socket.disconnect(), IDLE_DISCONNECT_MS)
        return
      }
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer)
        hideTimer = null
      }
      if (!socket.connected) socket.connect()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (hideTimer !== null) window.clearTimeout(hideTimer)
      if (publishTimerRef.current !== null) window.clearTimeout(publishTimerRef.current)
      if (viewportTimerRef.current !== null) window.clearTimeout(viewportTimerRef.current)
      socket.removeAllListeners()
      socket.close()
      socketRef.current = null
      storeRef.current = new Map()
      interpolator.clear()
    }
  }, [interpolator, schedulePublish, sendViewport])

  return { aircraft, interpolator, status, connected, setViewport }
}
