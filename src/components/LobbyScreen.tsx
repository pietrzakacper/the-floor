import { useEffect, useRef } from 'react'
import type { LobbyPlayerDraft, PlayerId } from '../types/game'
import type { BoardConfiguration } from '../lib/layout'
import { colorForPlayerIndex } from '../lib/colors'

type Props = {
  drafts: LobbyPlayerDraft[]
  boardChoices: BoardConfiguration[]
  boardChoicesLoading: boolean
  selectedBoardId: string
  onSelectBoard: (id: string) => void
  startAllowed: boolean
  onAddPlayer: () => void
  onRemovePlayer: (id: PlayerId) => void
  onUpdateDraft: (
    id: PlayerId,
    patch: Partial<Pick<LobbyPlayerDraft, 'name' | 'initialCategory'>>,
  ) => void
  onStart: () => void
}

function BoardPreview({ board }: { board: BoardConfiguration }) {
  const { rows, cols, cellIndices } = board
  const on = new Set(cellIndices)
  return (
    <div
      className="lobby-board-preview"
      style={{
        gridTemplateColumns: `repeat(${cols}, 10px)`,
        gridTemplateRows: `repeat(${rows}, 10px)`,
      }}
      aria-hidden
    >
      {Array.from({ length: rows * cols }, (_, flat) => (
        <span
          key={flat}
          className={
            on.has(flat) ? 'lobby-board-preview__on' : 'lobby-board-preview__off'
          }
        />
      ))}
    </div>
  )
}

function BoardChoicesSkeleton() {
  return (
    <ul className="lobby__board-list lobby__board-list--column lobby__board-skeleton" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="lobby__board-skeleton-row">
          <div className="lobby__board-skeleton-preview" />
          <div className="lobby__board-skeleton-lines">
            <div className="lobby__board-skeleton-line lobby__board-skeleton-line--short" />
            <div className="lobby__board-skeleton-line" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function LobbyScreen({
  drafts,
  boardChoices,
  boardChoicesLoading,
  selectedBoardId,
  onSelectBoard,
  startAllowed,
  onAddPlayer,
  onRemovePlayer,
  onUpdateDraft,
  onStart,
}: Props) {
  const n = drafts.length
  const noBoards = n >= 4 && !boardChoicesLoading && boardChoices.length === 0
  const playerListRef = useRef<HTMLUListElement>(null)
  const prevDraftCountRef = useRef(n)

  useEffect(() => {
    if (drafts.length > prevDraftCountRef.current) {
      requestAnimationFrame(() => {
        const el = playerListRef.current
        if (el) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
        }
      })
    }
    prevDraftCountRef.current = drafts.length
  }, [drafts.length])

  return (
    <div className="lobby">
      <header className="lobby__header">
        <h1 className="lobby__title">The Floor</h1>
        <p className="lobby__subtitle">
          Pre-game setup — at least 4 players. Every tile needs at least two edge neighbors.
        </p>
      </header>

      <section
        className="lobby__section lobby__section--split"
        aria-label="Players and board setup"
      >
        <div className="lobby__players-column">
          <h2 id="players-heading" className="lobby__h2">
            Players
          </h2>
          <ul
            ref={playerListRef}
            className="lobby__player-list lobby__player-list--scrollable"
            aria-labelledby="players-heading"
          >
            {drafts.map((p, i) => (
              <li key={p.id} className="lobby__player-row">
                <span
                  className="lobby__swatch"
                  style={{
                    background: colorForPlayerIndex(i),
                    boxShadow: `0 0 12px ${colorForPlayerIndex(i)}`,
                  }}
                  aria-hidden
                />
                <label className="lobby__field">
                  <span className="lobby__label">Name</span>
                  <input
                    className="lobby__input"
                    value={p.name}
                    onChange={(e) => onUpdateDraft(p.id, { name: e.target.value })}
                    placeholder={`Player ${i + 1}`}
                    autoComplete="off"
                  />
                </label>
                <label className="lobby__field lobby__field--grow">
                  <span className="lobby__label">Category</span>
                  <input
                    className="lobby__input"
                    value={p.initialCategory}
                    onChange={(e) => onUpdateDraft(p.id, { initialCategory: e.target.value })}
                    placeholder="e.g. Movies"
                    autoComplete="off"
                  />
                </label>
                <button
                  type="button"
                  className="lobby__btn lobby__btn--ghost lobby__btn--icon"
                  onClick={() => onRemovePlayer(p.id)}
                  disabled={drafts.length <= 1}
                  aria-label={`Remove player row ${i + 1}`}
                >
                  <svg
                    className="lobby__icon-bin"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="lobby__btn lobby__btn--secondary" onClick={onAddPlayer}>
            Add player
          </button>
        </div>

        <div
          className="lobby__board-column"
          aria-busy={boardChoicesLoading}
          aria-live="polite"
        >
          <h2 id="board-heading" className="lobby__h2">
            Board shape
          </h2>
          <p className="lobby__hint">
            Boards use the smallest square that fits everyone (e.g. 11 players → 4×4). Every
            connected pattern with ≥ 2 edge neighbors per tile is considered; the top options
            maximize total neighbor count. Pick one; players are placed randomly when you start.
          </p>
          {boardChoicesLoading && (
            <>
              <p className="lobby__loading-msg visually-hidden">Computing board shapes…</p>
              <BoardChoicesSkeleton />
            </>
          )}
          {!boardChoicesLoading && boardChoices.length > 0 && (
            <ul className="lobby__board-list lobby__board-list--column" role="list">
              {boardChoices.map((b) => {
                const selected = b.id === selectedBoardId
                return (
                  <li key={b.id}>
                    <label
                      className={`lobby__board-card${selected ? ' lobby__board-card--selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="board-shape"
                        className="lobby__board-radio"
                        checked={selected}
                        onChange={() => onSelectBoard(b.id)}
                      />
                      <BoardPreview board={b} />
                      <span className="lobby__board-label">{b.label}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
          {noBoards && (
            <p className="lobby__error">
              No valid board for this player count (each tile must touch at least two others on an
              edge). Try adding or removing players.
            </p>
          )}
          {!startAllowed && n < 4 && (
            <p className="lobby__error">Need at least 4 players to start.</p>
          )}
        </div>
      </section>

      <footer className="lobby__footer">
        <button
          type="button"
          className="lobby__btn lobby__btn--primary"
          disabled={!startAllowed}
          onClick={onStart}
        >
          Start game
        </button>
      </footer>
    </div>
  )
}
