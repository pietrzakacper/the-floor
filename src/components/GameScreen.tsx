import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CellAssignment, GameConfig, PlayerId } from '../types/game'
import { GridCell } from './GridCell'

type Props = {
  config: GameConfig
  assignment: CellAssignment
  onBack: () => void
  swapCellsForPlayers: (slotIndex: number, otherPlayerId: PlayerId) => void
  setPlayerCategoryFromInitial: (playerId: PlayerId, sourceInitialCategory: string) => void
}

export function GameScreen({
  config,
  assignment,
  onBack,
  swapCellsForPlayers,
  setPlayerCategoryFromInitial,
}: Props) {
  const { rows, cols, cellIndices, players } = config
  const [swapSlotIndex, setSwapSlotIndex] = useState<number | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const flatToSlot = useMemo(() => {
    const m = new Map<number, number>()
    cellIndices.forEach((flat, slot) => m.set(flat, slot))
    return m
  }, [cellIndices])

  const byId = useCallback(
    (id: PlayerId) => players.find((p) => p.id === id),
    [players],
  )

  const closeModal = useCallback(() => setSwapSlotIndex(null), [])

  useEffect(() => {
    if (swapSlotIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [swapSlotIndex, closeModal])

  const activePlayer =
    swapSlotIndex !== null ? byId(assignment[swapSlotIndex]!) : undefined

  const swapTargets =
    swapSlotIndex !== null
      ? players.filter((p) => p.id !== assignment[swapSlotIndex])
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
        <main className="game__grid-wrap" aria-label="Player grid">
          <div
            className="game__grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: rows * cols }, (_, flat) => {
              const slot = flatToSlot.get(flat)
              if (slot === undefined) {
                return <div key={flat} className="grid-cell grid-cell--hole" aria-hidden />
              }
              const pid = assignment[slot]
              const player = pid ? byId(pid) : undefined
              if (!player) return null
              return (
                <GridCell
                  key={flat}
                  slotIndex={slot}
                  player={player}
                  onActivate={setSwapSlotIndex}
                />
              )
            })}
          </div>
        </main>

        <aside className="game__roster" aria-label="Players and categories">
          <h2 className="game__roster-title">Players</h2>
          <p className="game__roster-hint">Set category using another player’s initial category.</p>
          <ul className="game__roster-list">
            {players.map((p) => (
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
                      const other = players.find((x) => x.id === oid)
                      if (other) setPlayerCategoryFromInitial(p.id, other.initialCategory)
                      e.target.value = ''
                    }}
                  >
                    <option value="">Copy from…</option>
                    {players
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

      {swapSlotIndex !== null && activePlayer && (
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
            aria-labelledby="swap-title"
          >
            <h2 id="swap-title" className="modal__title">
              Swap cell
            </h2>
            <p className="modal__text">
              Current: <strong>{activePlayer.name}</strong>. Pick another player to swap positions on
              the grid.
            </p>
            <ul className="modal__list">
              {swapTargets.map((p) => (
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
                      swapCellsForPlayers(swapSlotIndex, p.id)
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
