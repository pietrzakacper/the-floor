import { useLayoutEffect, useState, type RefObject } from 'react'

/** Must match `.game__grid` `column-gap` / `row-gap` in `game-ui.css`. */
export const GAME_GRID_COL_GAP_PX = 8
export const GAME_GRID_ROW_GAP_PX = 12

/**
 * Square cell side length (px) so `cols × rows` tiles plus gaps fit inside the container
 * without overflow. Uses min(width-fit, height-fit).
 */
export function useFitSquareCellSize(
  containerRef: RefObject<HTMLElement | null>,
  cols: number,
  visibleRowCount: number,
): number {
  const [cellPx, setCellPx] = useState(100)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const cs = getComputedStyle(el)
      const pt = Number.parseFloat(cs.paddingTop) || 0
      const pb = Number.parseFloat(cs.paddingBottom) || 0
      const pl = Number.parseFloat(cs.paddingLeft) || 0
      const pr = Number.parseFloat(cs.paddingRight) || 0
      const iw = el.clientWidth - pl - pr
      const ih = el.clientHeight - pt - pb

      if (visibleRowCount <= 0 || cols <= 0) {
        setCellPx(0)
        return
      }

      const maxW =
        (iw - (cols - 1) * GAME_GRID_COL_GAP_PX) / Math.max(cols, 1)
      const maxH =
        (ih - (visibleRowCount - 1) * GAME_GRID_ROW_GAP_PX) /
        Math.max(visibleRowCount, 1)
      const cell = Math.floor(Math.min(maxW, maxH))
      setCellPx(Math.max(1, cell))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [cols, visibleRowCount, containerRef])

  return cellPx
}
