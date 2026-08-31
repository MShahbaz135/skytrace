import { useEffect, useState } from 'react'
import { detectVisitorView, FALLBACK_VIEW, peekVisitorView, type MapView } from '@/lib/visitor-region'

export interface VisitorRegion {
  ready: boolean
  view: MapView
}

/**
 * One-shot lookup of the visitor's country so maps can open there instead of mid-Europe.
 *
 * Stays on a placeholder until the lookup finishes or times out, so the first viewport
 * reported to the server is already the right bounding box.
 */
export function useVisitorRegion(): VisitorRegion {
  const [state, setState] = useState<VisitorRegion>(() => {
    const cached = peekVisitorView()
    return cached ? { ready: true, view: cached } : { ready: false, view: FALLBACK_VIEW }
  })

  useEffect(() => {
    if (state.ready) return
    let cancelled = false

    void detectVisitorView().then((view) => {
      if (!cancelled) setState({ ready: true, view })
    })

    return () => {
      cancelled = true
    }
  }, [state.ready])

  return state
}
