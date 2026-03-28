import type { CSSProperties } from 'react'
import type { Player } from '../types/game'

type Props = {
  player: Player
  slotIndex: number
  onActivate: (slotIndex: number) => void
}

export function GridCell({ player, slotIndex, onActivate }: Props) {
  return (
    <button
      type="button"
      className="grid-cell"
      style={
        {
          '--cell-accent': player.color,
        } as CSSProperties
      }
      onClick={() => onActivate(slotIndex)}
      aria-label={`Tile ${slotIndex + 1}: ${player.name}, category ${player.currentCategory}. Click to swap player with another tile.`}
    >
      <span className="grid-cell__name">{player.name}</span>
      <span className="grid-cell__category">{player.currentCategory}</span>
    </button>
  )
}
