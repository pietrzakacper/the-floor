import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CellAssignment, GameConfig, Player, PlayerId } from '../types/game'
import eliminationSfx from '../assets/elimination.mp3'
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
  const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const pendingReplaceRef = useRef<{ slot: number; newId: PlayerId } | null>(null)

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
    if (assignSlotIndex === null || eliminatedPlayer) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [assignSlotIndex, eliminatedPlayer, closeModal])

  useEffect(() => {
    if (eliminatedPlayer === null) return
    let finished = false
    const complete = () => {
      if (finished) return
      finished = true
      const pending = pendingReplaceRef.current
      pendingReplaceRef.current = null
      setEliminatedPlayer(null)
      if (pending) {
        assignPlayerToSlot(pending.slot, pending.newId)
        setAssignSlotIndex(null)
      }
    }

    const audio = new Audio(eliminationSfx)
    const maxWait = window.setTimeout(complete, 4500)
    const onEnded = () => {
      window.clearTimeout(maxWait)
      complete()
    }
    audio.addEventListener('ended', onEnded)
    void audio.play().catch(() => {
      window.clearTimeout(maxWait)
      window.setTimeout(complete, 700)
    })

    return () => {
      window.clearTimeout(maxWait)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
    }
  }, [eliminatedPlayer, assignPlayerToSlot])

  const occupantId =
    assignSlotIndex !== null ? assignment[assignSlotIndex] : undefined
  const tileOccupant = occupantId ? byId(occupantId) : undefined

  const occupantTileCount = useMemo(() => {
    if (!occupantId) return 0
    let n = 0
    for (const pid of Object.values(assignment)) {
      if (pid === occupantId) n += 1
    }
    return n
  }, [assignment, occupantId])

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

      {eliminatedPlayer && (
        <div className="elimination-overlay">
          <div
            className="elimination-overlay__card"
            style={
              {
                '--ep-accent': eliminatedPlayer.color,
              } as CSSProperties
            }
          >
            <svg
              className="elimination-overlay__cross"
              viewBox="0 0 100 100"
              aria-hidden
              focusable="false"
            >
              <title>Elimination cross</title>
              <line
                x1="12"
                y1="12"
                x2="88"
                y2="88"
                stroke="currentColor"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <line
                x1="88"
                y1="12"
                x2="12"
                y2="88"
                stroke="currentColor"
                strokeWidth="14"
                strokeLinecap="round"
              />
            </svg>
            <span className="elimination-overlay__name">{eliminatedPlayer.name}</span>
            <span className="elimination-overlay__category">{eliminatedPlayer.currentCategory}</span>
          </div>
        </div>
      )}

      {assignSlotIndex !== null && !eliminatedPlayer && (
        <div className="modal-backdrop">
          <button
            type="button"
            className="modal-backdrop__scrim"
            aria-label="Close dialog"
            onClick={closeModal}
          />
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
                      if (assignSlotIndex === null) return
                      if (tileOccupant && occupantTileCount === 1) {
                        pendingReplaceRef.current = { slot: assignSlotIndex, newId: p.id }
                        setEliminatedPlayer(tileOccupant)
                      } else {
                        assignPlayerToSlot(assignSlotIndex, p.id)
                        closeModal()
                      }
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
