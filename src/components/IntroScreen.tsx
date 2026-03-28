import { useCallback, useEffect, useRef, useState } from 'react'
import type { CellAssignment, GameConfig, PlayerId } from '../types/game'
import introMusicUrl from '../assets/game_start.mp3'
import { GameBoardGrid } from './GameBoardGrid'
import { GridCell } from './GridCell'

type Props = {
  config: GameConfig
  assignment: CellAssignment
  onStart: () => void
}

export function IntroScreen({ config, assignment, onStart }: Props) {
  const { cellIndices, players } = config
  const slotCount = cellIndices.length
  /** Number of slots (0..slotCount-1) visible; first tile shows immediately, then +1 every 500ms. */
  const [revealedSlots, setRevealedSlots] = useState(() => (slotCount > 0 ? 1 : 0))
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const byId = useCallback(
    (id: PlayerId) => players.find((p) => p.id === id),
    [players],
  )

  useEffect(() => {
    const audio = new Audio(introMusicUrl)
    audioRef.current = audio
    void audio.play().catch(() => {
      /* autoplay blocked — user can still play */
    })
    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (revealedSlots >= slotCount) return
    const t = window.setTimeout(() => {
      setRevealedSlots((n) => n + 1)
    }, 500)
    return () => window.clearTimeout(t)
  }, [revealedSlots, slotCount])

  const noop = useCallback(() => {}, [])

  const introComplete = revealedSlots >= slotCount

  return (
    <div className="game game--intro">
      <header className="game__top game__top--intro">
        <h1 className="game__title">Intro</h1>
      </header>

      <div className="game__body game__body--intro">
        <main className="game__grid-wrap game__grid-wrap--intro" aria-label="Reveal board">
          <GameBoardGrid
            config={config}
            assignment={assignment}
            layoutMode="intro"
            renderPlayableCell={({ slot, gridPlacement }) => {
              const pid = assignment[slot]
              const player = pid ? byId(pid) : undefined
              const revealed = slot < revealedSlots
              return (
                <GridCell
                  slotIndex={slot}
                  player={revealed ? player : undefined}
                  onActivate={noop}
                  style={gridPlacement}
                  introHidden={!revealed}
                  interactive={false}
                />
              )
            }}
          />
        </main>
      </div>

      {introComplete && (
        <button type="button" className="intro__start-btn" onClick={onStart}>
          Start
        </button>
      )}
    </div>
  )
}
