import type { CSSProperties } from 'react'
import type { Player } from '../types/game'

type Props = {
  /** When missing, renders a vacant tile that still occupies its grid cell. */
  player?: Player
  slotIndex: number
  onActivate: (slotIndex: number) => void
  style?: CSSProperties
  /** Intro: tile not yet revealed — mystery placeholder. */
  introHidden?: boolean
  /** When false, tile is display-only (intro / read-only). */
  interactive?: boolean
}

export function GridCell({
  player,
  slotIndex,
  onActivate,
  style,
  introHidden = false,
  interactive = true,
}: Props) {
  const vacant = !player && !introHidden
  const commonStyle = {
    '--cell-accent': player?.color ?? '#3a3a42',
    ...style,
  } as CSSProperties

  const className = introHidden
    ? 'grid-cell grid-cell--intro-hidden'
    : vacant
      ? 'grid-cell grid-cell--vacant'
      : 'grid-cell'

  const content = introHidden ? (
    <>
      <span className="grid-cell__name grid-cell__name--intro-hidden">?</span>
      <span className="grid-cell__category grid-cell__category--intro-hidden"> </span>
    </>
  ) : vacant ? (
    <>
      <span className="grid-cell__name grid-cell__name--vacant">Empty</span>
      <span className="grid-cell__category grid-cell__category--vacant">Tap to assign</span>
    </>
  ) : player ? (
    <>
      <span className="grid-cell__name">{player.name}</span>
      <span className="grid-cell__category">{player.currentCategory}</span>
    </>
  ) : null

  if (!interactive) {
    if (introHidden) {
      return (
        <div className={className} style={commonStyle} aria-hidden>
          {content}
        </div>
      )
    }
    if (player) {
      return (
        <div
          className={className}
          style={commonStyle}
          role="img"
          aria-label={`Tile ${slotIndex + 1}: ${player.name}, category ${player.currentCategory}`}
        >
          {content}
        </div>
      )
    }
    return (
      <div className={className} style={commonStyle} role="img" aria-label={`Tile ${slotIndex + 1}: empty`}>
        {content}
      </div>
    )
  }

  const ariaLabel = vacant
    ? `Tile ${slotIndex + 1}: empty. Click to assign a player.`
    : player
      ? `Tile ${slotIndex + 1}: ${player.name}, category ${player.currentCategory}. Click to choose which player this tile shows.`
      : `Tile ${slotIndex + 1}`

  return (
    <button
      type="button"
      className={className}
      style={commonStyle}
      onClick={() => onActivate(slotIndex)}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  )
}
