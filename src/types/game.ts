export type PlayerId = string

export type Player = {
  id: PlayerId
  name: string
  initialCategory: string
  currentCategory: string
  /** Roster dropdown: which player’s initial was applied (stable when labels share the same text). */
  categorySourcePlayerId?: PlayerId | null
  color: string
}

export type LobbyPlayerDraft = {
  id: PlayerId
  name: string
  initialCategory: string
}

export type GameConfig = {
  rows: number
  cols: number
  /** Row-major indices of playable cells in the bounding box; same length as players */
  cellIndices: number[]
  players: Player[]
}

/** Playable slot index -> playerId (same player may appear on multiple tiles, or on none) */
export type CellAssignment = Record<number, PlayerId>

export type GamePhase = 'lobby' | 'intro' | 'game'
