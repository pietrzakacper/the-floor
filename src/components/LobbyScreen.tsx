import type { LobbyPlayerDraft, PlayerId } from '../types/game'
import type { BoardConfiguration } from '../lib/layout'
import { colorForPlayerIndex } from '../lib/colors'

type Props = {
  drafts: LobbyPlayerDraft[]
  boardChoices: BoardConfiguration[]
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

export function LobbyScreen({
  drafts,
  boardChoices,
  selectedBoardId,
  onSelectBoard,
  startAllowed,
  onAddPlayer,
  onRemovePlayer,
  onUpdateDraft,
  onStart,
}: Props) {
  const n = drafts.length
  const noBoards = n >= 4 && boardChoices.length === 0

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
                  className="lobby__btn lobby__btn--ghost"
                  onClick={() => onRemovePlayer(p.id)}
                  disabled={drafts.length <= 1}
                  aria-label={`Remove player row ${i + 1}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="lobby__btn lobby__btn--secondary" onClick={onAddPlayer}>
            Add player
          </button>
        </div>

        <div className="lobby__board-column">
          <h2 id="board-heading" className="lobby__h2">
            Board shape
          </h2>
          <p className="lobby__hint">
            Layout is derived from {n} player{n !== 1 ? 's' : ''}. Pick one of up to three valid
            boards. Players are placed randomly when you start.
          </p>
          {boardChoices.length > 0 && (
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
