import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CellAssignment, GameConfig, PlayerId } from '../types/game'
import { useFitSquareCellSize } from '../hooks/useFitSquareCellSize'
import { GridCell } from './GridCell'

type Props = {
  config: GameConfig
  assignment: CellAssignment
  onBack: () => void
  assignPlayerToSlot: (slotIndex: number, playerId: PlayerId) => void
  setPlayerCategoryFromInitial: (playerId: PlayerId, sourceInitialCategory: string) => void
}

export function GameScreen({
  config,
  assignment,
  onBack,
  assignPlayerToSlot,
  setPlayerCategoryFromInitial,
}: Props) {
  const { rows, cols, cellIndices, players } = config
  const [assignSlotIndex, setAssignSlotIndex] = useState<number | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const gridWrapRef = useRef<HTMLElement | null>(null)

  const flatToSlot = useMemo(() => {
    const m = new Map<number, number>()
    cellIndices.forEach((flat, slot) => m.set(flat, slot))
    return m
  }, [cellIndices])

  const byId = useCallback(
    (id: PlayerId) => players.find((p) => p.id === id),
    [players],
  )

  const rosterPlayers = useMemo(() => {
    const onBoard = new Set<PlayerId>()
    for (const pid of Object.values(assignment)) {
      if (pid) onBoard.add(pid)
    }
    return players.filter((p) => onBoard.has(p.id))
  }, [assignment, players])

  /** Rows with at least one occupied playable tile; fully vacant rows are omitted from layout. */
  const { visibleRowCount, displayRowByLogical } = useMemo(() => {
    const logicalRowHasOccupant = new Array<boolean>(rows).fill(false)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const flat = r * cols + c
        const slot = flatToSlot.get(flat)
        if (slot === undefined) continue
        const pid = assignment[slot]
        const player = pid ? byId(pid) : undefined
        if (player) logicalRowHasOccupant[r] = true
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
  }, [rows, cols, flatToSlot, assignment, byId])

  const cellPx = useFitSquareCellSize(gridWrapRef, cols, visibleRowCount)

  const closeModal = useCallback(() => setAssignSlotIndex(null), [])

  useEffect(() => {
    if (assignSlotIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [assignSlotIndex, closeModal])

  const tileOccupant =
    assignSlotIndex !== null ? byId(assignment[assignSlotIndex]!) : undefined

  const assignChoices =
    assignSlotIndex !== null
      ? players.filter((p) => p.id !== assignment[assignSlotIndex])
      : []

  return (
    <div className="game">
      <header className="game__top">
        <button type="button" className="game__btn-back" onClick={onBack}>
          ← Lobby
        </button>
        <h1 className="game__title">The Floor</h1>
      </header>

      <div className="game__body">
        <main ref={gridWrapRef} className="game__grid-wrap" aria-label="Player grid">
          <div
            className="game__grid"
            style={
              {
                '--cell-size': `${cellPx}px`,
                gridTemplateColumns:
                  visibleRowCount > 0
                    ? `repeat(${cols}, ${cellPx}px)`
                    : undefined,
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
                    key={flat}
                    className="grid-cell grid-cell--hole"
                    style={gridPlacement}
                    aria-hidden
                  />
                )
              }
              const pid = assignment[slot]
              const player = pid ? byId(pid) : undefined
              return (
                <GridCell
                  key={flat}
                  slotIndex={slot}
                  player={player}
                  onActivate={setAssignSlotIndex}
                  style={gridPlacement}
                />
              )
            })}
          </div>
        </main>

        <aside className="game__roster" aria-label="Players on the board">
          <h2 className="game__roster-title">Players</h2>
          <p className="game__roster-hint">
            Only players who occupy at least one tile are listed. Set category using another
            player’s initial category.
          </p>
          <ul className="game__roster-list">
            {rosterPlayers.map((p) => (
              <li key={p.id} className="game__roster-row">
                <span
                  className="game__roster-swatch"
                  style={{
                    background: p.color,
                    boxShadow: `0 0 10px ${p.color}`,
                  }}
                  aria-hidden
                />
                <div className="game__roster-meta">
                  <span className="game__roster-name">{p.name}</span>
                  <span className="game__roster-cat">{p.currentCategory}</span>
                </div>
                <label className="game__roster-select-wrap">
                  <span className="visually-hidden">Copy initial category from</span>
                  <select
                    className="game__roster-select"
                    value=""
                    aria-label={`Change category for ${p.name}`}
                    onChange={(e) => {
                      const oid = e.target.value as PlayerId
                      if (!oid) return
                      const other = rosterPlayers.find((x) => x.id === oid)
                      if (other) setPlayerCategoryFromInitial(p.id, other.initialCategory)
                      e.target.value = ''
                    }}
                  >
                    <option value="">Copy from…</option>
                    {rosterPlayers
                      .filter((o) => o.id !== p.id)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}: {o.initialCategory}
                        </option>
                      ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {assignSlotIndex !== null && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            ref={modalRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-title"
          >
            <h2 id="assign-title" className="modal__title">
              Who is on this tile?
            </h2>
            <p className="modal__text">
              {tileOccupant ? (
                <>
                  This tile currently shows <strong>{tileOccupant.name}</strong>. Pick a player to
                  display here — other tiles stay as they are, and the same player can be on multiple
                  tiles.
                </>
              ) : (
                <>Pick a player to display on this tile.</>
              )}
            </p>
            <ul className="modal__list">
              {assignChoices.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="modal__pick"
                    style={
                      {
                        '--pick-accent': p.color,
                      } as CSSProperties
                    }
                    onClick={() => {
                      assignPlayerToSlot(assignSlotIndex, p.id)
                      closeModal()
                    }}
                  >
                    <span
                      className="modal__pick-swatch"
                      style={{ background: p.color, boxShadow: `0 0 12px ${p.color}` }}
                    />
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="modal__cancel" onClick={closeModal}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
