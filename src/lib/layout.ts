import type { LobbyPlayerDraft, Player, PlayerId } from '../types/game'
import { colorForPlayerIndex } from './colors'

const MIN_PLAYERS = 4
const MIN_NEIGHBORS = 2
const DFS_STEP_LIMIT = 350_000

export type BoardConfiguration = {
  id: string
  label: string
  rows: number
  cols: number
  /** Row-major indices within the bounding box; length equals player count */
  cellIndices: number[]
}

const DIRS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function key(r: number, c: number): string {
  return `${r},${c}`
}

function parseKey(k: string): [number, number] {
  const [a, b] = k.split(',').map(Number)
  return [a!, b!]
}

function minEdgeNeighborsInSet(set: Set<string>): number {
  let min = Infinity
  for (const k of set) {
    const [r, c] = parseKey(k)
    let n = 0
    for (const [dr, dc] of DIRS) {
      if (set.has(key(r + dr, c + dc))) n++
    }
    min = Math.min(min, n)
  }
  return min
}

function normalizeSignature(set: Set<string>): string {
  const coords = [...set].map(parseKey)
  const minR = Math.min(...coords.map(([r]) => r))
  const minC = Math.min(...coords.map(([, c]) => c))
  const norm = coords
    .map(([r, c]) => [r - minR, c - minC] as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
  return norm.map(([r, c]) => `${r},${c}`).join('|')
}

function signatureToBoard(sig: string, idSuffix: string): BoardConfiguration {
  const pairs = sig.split('|').map((s) => {
    const [r, c] = s.split(',').map(Number)
    return [r!, c!] as [number, number]
  })
  const maxR = Math.max(...pairs.map(([r]) => r))
  const maxC = Math.max(...pairs.map(([, c]) => c))
  const rows = maxR + 1
  const cols = maxC + 1
  const occupied = new Set(pairs.map(([r, c]) => key(r, c)))
  const cellIndices: number[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (occupied.has(key(r, c))) {
        cellIndices.push(r * cols + c)
      }
    }
  }
  const isFullRect = cellIndices.length === rows * cols
  const label = isFullRect
    ? `${rows} × ${cols} rectangle`
    : `${rows} × ${cols} box · ${cellIndices.length} tiles`
  return {
    id: `board-${idSuffix}`,
    label,
    rows,
    cols,
    cellIndices,
  }
}

function rectKeySet(r: number, c: number): Set<string> {
  const s = new Set<string>()
  for (let row = 0; row < r; row++) {
    for (let col = 0; col < c; col++) {
      s.add(key(row, col))
    }
  }
  return s
}

function rectangleBoard(r: number, c: number): BoardConfiguration {
  const cellIndices: number[] = []
  for (let row = 0; row < r; row++) {
    for (let col = 0; col < c; col++) {
      cellIndices.push(row * c + col)
    }
  }
  return {
    id: `board-rect-${r}x${c}`,
    label: `${r} × ${c} rectangle`,
    rows: r,
    cols: c,
    cellIndices,
  }
}

function enumeratePolyominoSignatures(n: number): Set<string> {
  const signatures = new Set<string>()
  let steps = 0

  function dfs(set: Set<string>): void {
    steps++
    if (steps > DFS_STEP_LIMIT) return
    if (set.size === n) {
      if (minEdgeNeighborsInSet(set) >= MIN_NEIGHBORS) {
        signatures.add(normalizeSignature(set))
      }
      return
    }
    const frontier: string[] = []
    const seen = new Set<string>()
    for (const k of set) {
      const [r, c] = parseKey(k)
      for (const [dr, dc] of DIRS) {
        const nk = key(r + dr, c + dc)
        if (!set.has(nk) && !seen.has(nk)) {
          seen.add(nk)
          frontier.push(nk)
        }
      }
    }
    frontier.sort()
    for (const nk of frontier) {
      set.add(nk)
      dfs(set)
      set.delete(nk)
    }
  }

  dfs(new Set([key(0, 0)]))
  return signatures
}

function shortHash(sig: string): string {
  let h = 0
  for (let i = 0; i < sig.length; i++) {
    h = (h * 31 + sig.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

function pickDiverseThree(boards: BoardConfiguration[]): BoardConfiguration[] {
  if (boards.length <= 3) return boards
  const scored = boards.map((b) => ({
    b,
    ratio: b.rows / Math.max(1, b.cols),
    area: b.rows * b.cols,
  }))
  scored.sort((a, b) => a.ratio - b.ratio)
  const k = scored.length
  const idxs = [0, Math.floor(k / 3), Math.floor((2 * k) / 3)]
  const picked: BoardConfiguration[] = []
  const seen = new Set<string>()
  for (const i of idxs) {
    const b = scored[i]!.b
    if (!seen.has(b.id)) {
      seen.add(b.id)
      picked.push(b)
    }
  }
  let x = 0
  while (picked.length < 3 && x < k) {
    const b = scored[x]!.b
    if (!seen.has(b.id)) {
      seen.add(b.id)
      picked.push(b)
    }
    x++
  }
  return picked.slice(0, 3)
}

/** All valid boards for n cells (min 2 edge neighbors each), then up to 3 diverse picks */
export function getBoardConfigurationChoices(n: number): BoardConfiguration[] {
  if (n < MIN_PLAYERS) return []

  const bySig = new Map<string, BoardConfiguration>()

  for (let r = 2; r * r <= n; r++) {
    if (n % r !== 0) continue
    const c = n / r
    if (c < 2) continue
    const b1 = rectangleBoard(r, c)
    bySig.set(normalizeSignature(rectKeySet(r, c)), b1)
    if (r !== c) {
      const b2 = rectangleBoard(c, r)
      bySig.set(normalizeSignature(rectKeySet(c, r)), b2)
    }
  }

  for (const sig of enumeratePolyominoSignatures(n)) {
    if (sig.split('|').length !== n) continue
    if (bySig.has(sig)) continue
    const board = signatureToBoard(sig, `poly-${shortHash(sig)}`)
    if (board.cellIndices.length === n) bySig.set(sig, board)
  }

  const unique = [...bySig.values()]
  const withRectsFirst = unique.sort((a, b) => {
    const aFull = a.cellIndices.length === a.rows * a.cols ? 0 : 1
    const bFull = b.cellIndices.length === b.rows * b.cols ? 0 : 1
    if (aFull !== bFull) return aFull - bFull
    return a.rows * a.cols - b.rows * b.cols
  })

  return pickDiverseThree(withRectsFirst)
}

export function canStartGame(playerCount: number, choices: BoardConfiguration[], selectedId: string): boolean {
  if (playerCount < MIN_PLAYERS) return false
  if (choices.length === 0) return false
  return choices.some((c) => c.id === selectedId)
}

export function lobbyDraftsToPlayers(drafts: LobbyPlayerDraft[]): Player[] {
  return drafts.map((d, i) => ({
    id: d.id,
    name: d.name.trim() || `Player ${i + 1}`,
    initialCategory: d.initialCategory.trim() || 'Category',
    currentCategory: d.initialCategory.trim() || 'Category',
    color: colorForPlayerIndex(i),
  }))
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}

/** slot index 0..n-1 -> playerId, random permutation */
export function buildRandomAssignment(players: Player[], slotCount: number): Record<number, PlayerId> {
  const shuffled = [...players]
  shuffleInPlace(shuffled)
  const assignment: Record<number, PlayerId> = {}
  for (let i = 0; i < slotCount; i++) {
    assignment[i] = shuffled[i]!.id
  }
  return assignment
}
