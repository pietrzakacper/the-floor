import {
  Fragment,
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type { CellAssignment, GameConfig, PlayerId } from '../types/game'
import { useFitSquareCellSize } from '../hooks/useFitSquareCellSize'

export type GameBoardGridLayoutMode = 'game' | 'intro'

type RenderPlayableCell = (args: {
  flat: number
  slot: number
  gridPlacement: { readonly gridRow: number; readonly gridColumn: number }
}) => ReactNode

type Props = {
  config: GameConfig
  assignment: CellAssignment
  layoutMode: GameBoardGridLayoutMode
  renderPlayableCell: RenderPlayableCell
}

export function GameBoardGrid({
  config,
  assignment,
  layoutMode,
  renderPlayableCell,
}: Props) {
  const { rows, cols, cellIndices, players } = config
  const gridElRef = useRef<HTMLDivElement | null>(null)

  const flatToSlot = useMemo(() => {
    const m = new Map<number, number>()
    cellIndices.forEach((flat, slot) => m.set(flat, slot))
    return m
  }, [cellIndices])

  const byId = useCallback(
    (id: PlayerId) => players.find((p) => p.id === id),
    [players],
  )

  const { visibleRowCount, displayRowByLogical } = useMemo(() => {
    const logicalRowHasOccupant = new Array<boolean>(rows).fill(false)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const flat = r * cols + c
        const slot = flatToSlot.get(flat)
        if (slot === undefined) continue
        const pid = assignment[slot]
        if (layoutMode === 'intro') {
          if (pid) logicalRowHasOccupant[r] = true
        } else {
          const player = pid ? byId(pid) : undefined
          if (player) logicalRowHasOccupant[r] = true
        }
      }
    }
    const displayRowByLogical = new Map<number, number>()
    let displayRow = 0
    for (let r = 0; r < rows; r++) {
      if (logicalRowHasOccupant[r]) {
        displayRowByLogical.set(r, displayRow)
        displayRow += 1
      }
    }
    return { visibleRowCount: displayRow, displayRowByLogical }
  }, [rows, cols, flatToSlot, assignment, byId, layoutMode])

  const cellPx = useFitSquareCellSize(gridElRef, cols, visibleRowCount)

  return (
    <div
      ref={gridElRef}
      className="game__grid"
      style={
        {
          '--cell-size': `${cellPx}px`,
          gridTemplateColumns:
            visibleRowCount > 0 ? `repeat(${cols}, ${cellPx}px)` : undefined,
          gridTemplateRows:
            visibleRowCount > 0
              ? `repeat(${visibleRowCount}, ${cellPx}px)`
              : undefined,
        } as CSSProperties
      }
    >
      {Array.from({ length: rows * cols }, (_, flat) => {
        const r = Math.floor(flat / cols)
        const c = flat % cols
        const cellKey = `${r}-${c}`
        const displayRow = displayRowByLogical.get(r)
        if (displayRow === undefined) return null

        const gridPlacement = {
          gridRow: displayRow + 1,
          gridColumn: c + 1,
        } as const

        const slot = flatToSlot.get(flat)
        if (slot === undefined) {
          return (
            <div
              key={cellKey}
              className="grid-cell grid-cell--hole"
              style={gridPlacement}
              aria-hidden
            />
          )
        }

        return (
          <Fragment key={cellKey}>{renderPlayableCell({ flat, slot, gridPlacement })}</Fragment>
        )
      })}
    </div>
  )
}
