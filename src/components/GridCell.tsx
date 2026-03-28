import type { CSSProperties } from 'react'
import type { Player } from '../types/game'

type Props = {
  /** When missing, renders a vacant tile that still occupies its grid cell. */
  player?: Player
  slotIndex: number
  onActivate: (slotIndex: number) => void
  style?: CSSProperties
}

export function GridCell({ player, slotIndex, onActivate, style }: Props) {
  const vacant = !player
  return (
    <button
      type="button"
      className={vacant ? 'grid-cell grid-cell--vacant' : 'grid-cell'}
      style={
        {
          '--cell-accent': player?.color ?? '#3a3a42',
          ...style,
        } as CSSProperties
      }
      onClick={() => onActivate(slotIndex)}
      aria-label={
        vacant
          ? `Tile ${slotIndex + 1}: empty. Click to assign a player.`
          : `Tile ${slotIndex + 1}: ${player.name}, category ${player.currentCategory}. Click to choose which player this tile shows.`
      }
    >
      {vacant ? (
        <>
          <span className="grid-cell__name grid-cell__name--vacant">Empty</span>
          <span className="grid-cell__category grid-cell__category--vacant">Tap to assign</span>
        </>
      ) : (
        <>
          <span className="grid-cell__name">{player.name}</span>
          <span className="grid-cell__category">{player.currentCategory}</span>
        </>
      )}
    </button>
  )
}
