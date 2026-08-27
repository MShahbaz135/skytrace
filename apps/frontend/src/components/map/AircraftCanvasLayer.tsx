import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { derivePhase, type AircraftState } from '@skytrace/shared'
import type { PositionInterpolator, Sample } from '@/lib/interpolation'
import {
  PHASE_COLOURS,
  SELECTED_COLOUR,
  getDotSprite,
  getPlaneSprite,
  levelOfDetail,
} from './aircraft-sprites'

/** Pixels beyond the viewport edge that still get drawn, so glyphs slide in rather than pop. */
const CULL_MARGIN_PX = 48

/** Side length of a hit-test grid cell, in CSS pixels. */
const GRID_CELL_PX = 64

/** Maximum cursor distance that still counts as clicking an aircraft. */
const HIT_RADIUS_PX = 18

interface GridEntry {
  icao24: string
  x: number
  y: number
}

interface LayerData {
  states: Map<string, AircraftState>
  interpolator: PositionInterpolator
  selectedId: string | null
}

/**
 * Draws every tracked aircraft into a single canvas.
 *
 * The previous implementation created one Leaflet `divIcon` per aircraft. That is roughly
 * three DOM nodes each, restyled on every update, which stops being viable somewhere in
 * the low hundreds. One canvas plus cached sprites keeps a four-figure aircraft count at
 * animation frame rate.
 */
class AircraftLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private frameHandle: number | null = null

  private data: LayerData | null = null
  private readonly samples = new Map<string, Sample>()
  private readonly grid = new Map<string, GridEntry[]>()

  private widthPx = 0
  private heightPx = 0
  private dpr = 1
  private hovering = false

  private readonly onSelect: (icao24: string | null) => void

  constructor(onSelect: (icao24: string | null) => void) {
    super()
    this.onSelect = onSelect
  }

  setData(data: LayerData): void {
    this.data = data
  }

  onAdd(map: L.Map): this {
    const canvas = L.DomUtil.create('canvas', 'skytrace-aircraft-layer') as HTMLCanvasElement
    canvas.style.position = 'absolute'
    canvas.style.left = '0'
    canvas.style.top = '0'
    // Clicks are resolved against the map, so the canvas must not intercept pointer events
    // or dragging the map would stop working.
    canvas.style.pointerEvents = 'none'

    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    map.getPanes().overlayPane.appendChild(canvas)

    map.on('zoomanim', this.handleZoomAnim, this)
    map.on('click', this.handleClick, this)
    map.on('mousemove', this.handleMouseMove, this)

    this.startLoop()
    return this
  }

  onRemove(map: L.Map): this {
    this.stopLoop()
    map.off('zoomanim', this.handleZoomAnim, this)
    map.off('click', this.handleClick, this)
    map.off('mousemove', this.handleMouseMove, this)

    this.canvas?.remove()
    this.canvas = null
    this.ctx = null
    return this
  }

  private startLoop(): void {
    const tick = () => {
      this.render()
      this.frameHandle = requestAnimationFrame(tick)
    }
    this.frameHandle = requestAnimationFrame(tick)
  }

  private stopLoop(): void {
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
  }

  /**
   * Keeps the canvas aligned during Leaflet's animated zoom.
   *
   * The pixel content cannot be re-projected mid-animation, so it is transformed to match
   * what the animation is doing and redrawn crisply once the new zoom settles.
   */
  private handleZoomAnim(event: L.ZoomAnimEvent): void {
    const map = this._map
    if (!map || !this.canvas) return

    const scale = map.getZoomScale(event.zoom, map.getZoom())
    const topLeft = map.containerPointToLatLng([0, 0])
    const offset = (
      map as unknown as {
        _latLngToNewLayerPoint: (latlng: L.LatLng, zoom: number, center: L.LatLng) => L.Point
      }
    )._latLngToNewLayerPoint(topLeft, event.zoom, event.center)

    L.DomUtil.setTransform(this.canvas, offset, scale)
  }

  private render(): void {
    const map = this._map
    const { canvas, ctx, data } = this
    if (!map || !canvas || !ctx || !data) return

    const size = map.getSize()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    if (size.x !== this.widthPx || size.y !== this.heightPx || dpr !== this.dpr) {
      this.widthPx = size.x
      this.heightPx = size.y
      this.dpr = dpr
      canvas.width = Math.round(size.x * dpr)
      canvas.height = Math.round(size.y * dpr)
      canvas.style.width = `${size.x}px`
      canvas.style.height = `${size.y}px`
    }

    // Re-anchor to the map pane every frame so panning stays pixel-accurate.
    L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]))

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.x, size.y)

    const now = performance.timeOrigin + performance.now()
    data.interpolator.sampleAllInto(this.samples, now)

    const zoom = map.getZoom()
    const lod = levelOfDetail(zoom)
    this.grid.clear()

    let selectedDraw: { sample: Sample; x: number; y: number } | null = null

    for (const [icao24, sample] of this.samples) {
      const point = map.latLngToContainerPoint([sample.lat, sample.lng])

      // Viewport culling: most of the tracked set is off-screen at any given moment.
      if (
        point.x < -CULL_MARGIN_PX ||
        point.y < -CULL_MARGIN_PX ||
        point.x > size.x + CULL_MARGIN_PX ||
        point.y > size.y + CULL_MARGIN_PX
      ) {
        continue
      }

      this.addToGrid(icao24, point.x, point.y)

      if (icao24 === data.selectedId) {
        selectedDraw = { sample, x: point.x, y: point.y }
        continue
      }

      const state = data.states.get(icao24)
      const colour = state ? PHASE_COLOURS[derivePhase(state)] : PHASE_COLOURS.cruising
      this.drawGlyph(ctx, lod.kind, lod.size, colour, false, point.x, point.y, sample.heading)
    }

    // Drawn last so it is never hidden behind neighbouring traffic.
    if (selectedDraw) {
      const selectedSize = lod.kind === 'dot' ? 5 : lod.size * 1.35
      this.drawGlyph(
        ctx,
        lod.kind === 'dot' ? 'dot' : 'plane',
        selectedSize,
        SELECTED_COLOUR,
        true,
        selectedDraw.x,
        selectedDraw.y,
        selectedDraw.sample.heading,
      )
    }
  }

  private drawGlyph(
    ctx: CanvasRenderingContext2D,
    kind: 'dot' | 'plane',
    size: number,
    colour: string,
    glow: boolean,
    x: number,
    y: number,
    heading: number,
  ): void {
    if (kind === 'dot') {
      const sprite = getDotSprite(size, colour)
      const extent = sprite.anchor * 2
      ctx.drawImage(sprite.canvas, x - sprite.anchor, y - sprite.anchor, extent, extent)
      return
    }

    const sprite = getPlaneSprite(size, colour, glow)
    const extent = sprite.anchor * 2

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((heading * Math.PI) / 180)
    ctx.drawImage(sprite.canvas, -sprite.anchor, -sprite.anchor, extent, extent)
    ctx.restore()
  }

  private addToGrid(icao24: string, x: number, y: number): void {
    const key = `${Math.floor(x / GRID_CELL_PX)}:${Math.floor(y / GRID_CELL_PX)}`
    const cell = this.grid.get(key)
    if (cell) cell.push({ icao24, x, y })
    else this.grid.set(key, [{ icao24, x, y }])
  }

  /**
   * Finds the nearest aircraft to a screen point.
   *
   * Only the nine grid cells around the cursor are examined, so cost stays constant as the
   * number of rendered aircraft grows.
   */
  private hitTest(x: number, y: number): string | null {
    const cellX = Math.floor(x / GRID_CELL_PX)
    const cellY = Math.floor(y / GRID_CELL_PX)

    let best: string | null = null
    let bestDistance = HIT_RADIUS_PX * HIT_RADIUS_PX

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = this.grid.get(`${cellX + dx}:${cellY + dy}`)
        if (!cell) continue

        for (const entry of cell) {
          const distance = (entry.x - x) ** 2 + (entry.y - y) ** 2
          if (distance < bestDistance) {
            bestDistance = distance
            best = entry.icao24
          }
        }
      }
    }

    return best
  }

  private handleClick(event: L.LeafletMouseEvent): void {
    const hit = this.hitTest(event.containerPoint.x, event.containerPoint.y)
    // A click on empty sky clears the selection, which is what the detail panel expects.
    this.onSelect(hit)
  }

  private handleMouseMove(event: L.LeafletMouseEvent): void {
    const map = this._map
    if (!map) return

    const over = this.hitTest(event.containerPoint.x, event.containerPoint.y) !== null
    if (over === this.hovering) return

    this.hovering = over
    map.getContainer().style.cursor = over ? 'pointer' : ''
  }
}

export interface AircraftCanvasLayerProps {
  states: Map<string, AircraftState>
  interpolator: PositionInterpolator
  selectedId: string | null
  onSelect: (icao24: string | null) => void
}

export function AircraftCanvasLayer({
  states,
  interpolator,
  selectedId,
  onSelect,
}: AircraftCanvasLayerProps) {
  const map = useMap()
  const layerRef = useRef<AircraftLayer | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const layer = new AircraftLayer((icao24) => onSelectRef.current(icao24))
    layerRef.current = layer
    layer.addTo(map)

    return () => {
      layer.remove()
      layerRef.current = null
    }
  }, [map])

  // Pushed through a ref rather than React state: the render loop reads this every frame
  // and must not be coupled to the component's re-render cadence.
  useEffect(() => {
    layerRef.current?.setData({ states, interpolator, selectedId })
  }, [states, interpolator, selectedId])

  return null
}
