import type { CSSProperties, ReactNode } from 'react'
import type { Player } from '../types/game'

const PARTICLE_OUTER_KEYS = [
  'o0', 'o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10', 'o11', 'o12', 'o13', 'o14', 'o15',
] as const
const PARTICLE_INNER_KEYS = ['i0', 'i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7'] as const

function flashyDecoratedContent(content: ReactNode): ReactNode {
  return (
    <>
      <span className="grid-cell__particles" aria-hidden>
        {PARTICLE_OUTER_KEYS.map((key, i) => (
          <span
            key={key}
            className="grid-cell__particle"
            style={{ '--particle-i': i } as CSSProperties}
          />
        ))}
        {PARTICLE_INNER_KEYS.map((key, i) => (
          <span
            key={key}
            className="grid-cell__particle grid-cell__particle--inner"
            style={{ '--particle-i': i } as CSSProperties}
          />
        ))}
      </span>
      <span className="grid-cell__spark-ring" aria-hidden />
      <span className="grid-cell__body">{content}</span>
    </>
  )
}

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

  const showFlashy = Boolean(player && !introHidden)

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

  const cellInner = showFlashy ? flashyDecoratedContent(content) : content

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
          {cellInner}
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
      {cellInner}
    </button>
  )
}
