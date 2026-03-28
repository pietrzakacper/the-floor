import { useLayoutEffect, useState, type RefObject } from 'react'

/** Fallbacks if `getComputedStyle` gaps are missing / `normal`. */
export const GAME_GRID_COL_GAP_PX = 8
export const GAME_GRID_ROW_GAP_PX = 12

function parseCssPx(value: string, fallback: number): number {
  if (!value || value === 'normal') return fallback
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Largest uniform square side (px) so `cols × visibleRowCount` cells plus gaps fit inside
 * the **grid element’s** content box. Ref must be the `.game__grid` node (the grid container).
 */
export function useFitSquareCellSize(
  gridElementRef: RefObject<HTMLElement | null>,
  cols: number,
  visibleRowCount: number,
): number {
  const [cellPx, setCellPx] = useState(100)

  useLayoutEffect(() => {
    const el = gridElementRef.current
    if (!el) return

    const measure = () => {
      const cs = getComputedStyle(el)
      const pt = Number.parseFloat(cs.paddingTop) || 0
      const pb = Number.parseFloat(cs.paddingBottom) || 0
      const pl = Number.parseFloat(cs.paddingLeft) || 0
      const pr = Number.parseFloat(cs.paddingRight) || 0
      const iw = el.clientWidth - pl - pr
      const ih = el.clientHeight - pt - pb

      const colGap = parseCssPx(cs.columnGap, GAME_GRID_COL_GAP_PX)
      const rowGap = parseCssPx(cs.rowGap, GAME_GRID_ROW_GAP_PX)

      if (visibleRowCount <= 0 || cols <= 0) {
        setCellPx(0)
        return
      }

      const maxW = (iw - (cols - 1) * colGap) / Math.max(cols, 1)
      const maxH =
        (ih - (visibleRowCount - 1) * rowGap) / Math.max(visibleRowCount, 1)
      const cell = Math.floor(Math.min(maxW, maxH))
      setCellPx(Math.max(1, cell))
    }

    const scheduleMeasure = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(measure)
      })
    }

    scheduleMeasure()
    const ro = new ResizeObserver(() => scheduleMeasure())
    ro.observe(el)
    window.addEventListener('resize', scheduleMeasure)
    const vv = window.visualViewport
    vv?.addEventListener('resize', scheduleMeasure)
    vv?.addEventListener('scroll', scheduleMeasure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
      vv?.removeEventListener('resize', scheduleMeasure)
      vv?.removeEventListener('scroll', scheduleMeasure)
    }
  }, [cols, visibleRowCount, gridElementRef])

  return cellPx
}
