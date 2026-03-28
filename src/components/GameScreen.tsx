import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CellAssignment, GameConfig, Player, PlayerId } from '../types/game'
import { GameBoardGrid } from './GameBoardGrid'
import { GridCell } from './GridCell'

type Props = {
  config: GameConfig
  assignment: CellAssignment
  onBack: () => void
  assignPlayerToSlot: (slotIndex: number, playerId: PlayerId) => void
  setPlayerCategoryFromPlayer: (playerId: PlayerId, sourcePlayerId: PlayerId) => void
}

function rosterCategorySelectValue(p: Player, players: Player[]): PlayerId | '__current__' {
  const sid = p.categorySourcePlayerId
  if (sid) {
    const src = players.find((x) => x.id === sid)
    if (src && src.initialCategory === p.currentCategory) {
      return sid
    }
  }
  const matched = players.find((o) => o.initialCategory === p.currentCategory)
  return matched?.id ?? '__current__'
}

export function GameScreen({
  config,
  assignment,
  onBack,
  assignPlayerToSlot,
  setPlayerCategoryFromPlayer,
}: Props) {
  const { players } = config
  const [assignSlotIndex, setAssignSlotIndex] = useState<number | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

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
        <main className="game__grid-wrap" aria-label="Player grid">
          <GameBoardGrid
            config={config}
            assignment={assignment}
            layoutMode="game"
            renderPlayableCell={({ slot, gridPlacement }) => {
              const pid = assignment[slot]
              const player = pid ? byId(pid) : undefined
              return (
                <GridCell
                  slotIndex={slot}
                  player={player}
                  onActivate={setAssignSlotIndex}
                  style={gridPlacement}
                />
              )
            }}
          />
        </main>

        <aside className="game__roster" aria-label="Players on the board">
          <h2 className="game__roster-title">Players</h2>
          <p className="game__roster-hint">
            Only players who occupy at least one tile are listed. Each category list includes
            everyone’s initial category, including your own.
          </p>
          <ul className="game__roster-list">
            {rosterPlayers.map((p) => {
              const selectValue = rosterCategorySelectValue(p, players)
              const showCurrentOption = selectValue === '__current__'
              return (
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
                  </div>
                  <div className="game__roster-field">
                    <select
                      key={`${p.id}-${selectValue}-${p.currentCategory}`}
                      className="game__roster-select"
                      value={selectValue}
                      aria-label={`Category for ${p.name}`}
                      onChange={(e) => {
                        const v = e.target.value as PlayerId | '__current__'
                        if (v === '__current__') return
                        setPlayerCategoryFromPlayer(p.id, v)
                      }}
                    >
                      {showCurrentOption && (
                        <option value="__current__">
                          {p.currentCategory.trim() ? p.currentCategory : '—'}
                        </option>
                      )}
                      {players.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.initialCategory}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              )
            })}
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
