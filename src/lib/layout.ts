import type { LobbyPlayerDraft, Player, PlayerId } from '../types/game'
import { colorForPlayerIndex } from './colors'

const MIN_PLAYERS = 4
const MIN_NEIGHBORS = 2
/** When DFS fallback is used (huge combination count), cap visits. */
const DFS_STEP_LIMIT = 900_000
/** Max combinations to enumerate exhaustively (then we yield periodically). */
const MAX_EXHAUSTIVE_COMBINATIONS = 280_000
/** If minimal square yields nothing valid, try s+1 … up to this many extra rows/cols. */
const MAX_SQUARE_EXPANSION = 6

/** DFS / combination steps between yields to the main thread (requestAnimationFrame). */
export const GRID_COMPUTE_YIELD_EVERY = 2048

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

function shortHash(sig: string): string {
  let h = 0
  for (let i = 0; i < sig.length; i++) {
    h = (h * 31 + sig.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

/** Smallest s with s*s >= n (square that can hold n tiles). */
export function minimalSquareSide(n: number): number {
  return Math.ceil(Math.sqrt(n))
}

function countBinomialCapped(n: number, k: number, cap: number): number | null {
  k = Math.min(k, n - k)
  if (k < 0) return 0
  let c = 1
  for (let i = 1; i <= k; i++) {
    c = Math.round((c * (n - i + 1)) / i)
    if (c > cap) return null
  }
  return c
}

function firstCombination(k: number): number[] {
  return Array.from({ length: k }, (_, i) => i)
}

function nextCombination(combo: number[], universe: number): boolean {
  const k = combo.length
  let i = k - 1
  while (i >= 0 && combo[i] === universe - k + i) i--
  if (i < 0) return false
  combo[i]++
  for (let j = i + 1; j < k; j++) combo[j] = combo[j - 1] + 1
  return true
}

function isConnectedFlats(flats: number[], s: number): boolean {
  const set = new Set(flats)
  const start = flats[0]!
  const stack = [start]
  const seen = new Set([start])
  while (stack.length) {
    const f = stack.pop()!
    const r = Math.floor(f / s)
    const c = f % s
    const cand: number[] = []
    if (r > 0) cand.push(f - s)
    if (r < s - 1) cand.push(f + s)
    if (c > 0) cand.push(f - 1)
    if (c < s - 1) cand.push(f + 1)
    for (const nf of cand) {
      if (!set.has(nf) || seen.has(nf)) continue
      seen.add(nf)
      stack.push(nf)
    }
  }
  return seen.size === flats.length
}

function minDegreeFlats(flats: number[], s: number): number {
  const set = new Set(flats)
  let min = Infinity
  for (const f of flats) {
    const r = Math.floor(f / s)
    const c = f % s
    let d = 0
    if (r > 0 && set.has(f - s)) d++
    if (r < s - 1 && set.has(f + s)) d++
    if (c > 0 && set.has(f - 1)) d++
    if (c < s - 1 && set.has(f + 1)) d++
    min = Math.min(min, d)
  }
  return min
}

function boardFromSortedFlats(flatsSorted: number[], s: number): BoardConfiguration {
  const n = flatsSorted.length
  const isFull = n === s * s
  const idKey = flatsSorted.join(',')
  return {
    id: `board-s${s}-${shortHash(idKey)}`,
    label: isFull ? `${s} × ${s} (all tiles)` : `${s} × ${s} box · ${n} tiles`,
    rows: s,
    cols: s,
    cellIndices: [...flatsSorted],
  }
}

/** Sum over tiles of in-shape 4-neighbor counts. */
function totalInShapeNeighborSum(board: BoardConfiguration): number {
  const { rows, cols, cellIndices } = board
  const occ = new Set(cellIndices)
  let sum = 0
  for (const flat of cellIndices) {
    const r = Math.floor(flat / cols)
    const c = flat % cols
    if (r > 0 && occ.has(flat - cols)) sum++
    if (r < rows - 1 && occ.has(flat + cols)) sum++
    if (c > 0 && occ.has(flat - 1)) sum++
    if (c < cols - 1 && occ.has(flat + 1)) sum++
  }
  return sum
}

function boundingBoxAspectRatio(board: BoardConfiguration): number {
  const { rows: r, cols: c } = board
  return Math.max(r, c) / Math.min(r, c)
}

function isFullBoundingRectangle(board: BoardConfiguration): boolean {
  return board.cellIndices.length === board.rows * board.cols
}

function compareBoardsByNeighborObjective(a: BoardConfiguration, b: BoardConfiguration): number {
  const aSum = totalInShapeNeighborSum(a)
  const bSum = totalInShapeNeighborSum(b)
  if (bSum !== aSum) return bSum - aSum

  const aAsp = boundingBoxAspectRatio(a)
  const bAsp = boundingBoxAspectRatio(b)
  if (aAsp !== bAsp) return aAsp - bAsp

  const aFull = isFullBoundingRectangle(a) ? 0 : 1
  const bFull = isFullBoundingRectangle(b) ? 0 : 1
  if (aFull !== bFull) return aFull - bFull

  const aArea = a.rows * a.cols
  const bArea = b.rows * b.cols
  if (aArea !== bArea) return aArea - bArea

  return a.id.localeCompare(b.id)
}

const MAX_BOARD_CHOICES = 3

function finalizeBoardChoices(bySig: Map<string, BoardConfiguration>): BoardConfiguration[] {
  const unique = [...bySig.values()]
  unique.sort(compareBoardsByNeighborObjective)
  return unique.slice(0, MAX_BOARD_CHOICES)
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

/**
 * Enumerate all n-subsets (or hole-subsets) inside s×s when combination count is small enough.
 */
async function exhaustiveEnumerateInSquare(
  s: number,
  n: number,
  bySig: Map<string, BoardConfiguration>,
  signal: AbortSignal | undefined,
  yieldEvery: number,
): Promise<void> {
  const T = s * s
  const useHoles = T - n < n
  const k = useHoles ? T - n : n
  let iterations = 0

  const processFlats = (flats: number[]) => {
    if (flats.length !== n) return
    flats.sort((a, b) => a - b)
    if (!isConnectedFlats(flats, s)) return
    if (minDegreeFlats(flats, s) < MIN_NEIGHBORS) return
    const sig = flats.join(',')
    if (bySig.has(sig)) return
    bySig.set(sig, boardFromSortedFlats(flats, s))
  }

  if (k === 0) {
    if (useHoles) {
      const flats = Array.from({ length: T }, (_, i) => i)
      processFlats(flats)
    }
    return
  }

  const combo = firstCombination(k)

  do {
    if (signal?.aborted) return
    iterations++
    if (iterations % yieldEvery === 0) {
      await yieldToMain()
      if (signal?.aborted) return
    }

    if (useHoles) {
      const holeSet = new Set(combo)
      const flats: number[] = []
      for (let i = 0; i < T; i++) {
        if (!holeSet.has(i)) flats.push(i)
      }
      processFlats(flats)
    } else {
      processFlats([...combo])
    }
  } while (nextCombination(combo, T))
}

/**
 * DFS polyominoes of size n confined to [0,s)²; dedupe by sorted flat list.
 */
async function dfsEnumerateInSquare(
  s: number,
  n: number,
  bySig: Map<string, BoardConfiguration>,
  signal: AbortSignal | undefined,
  yieldEvery: number,
): Promise<void> {
  let steps = 0
  const T = s * s

  async function dfs(set: Set<string>): Promise<void> {
    if (signal?.aborted) return
    steps++
    if (steps % yieldEvery === 0) {
      await yieldToMain()
      if (signal?.aborted) return
    }
    if (steps > DFS_STEP_LIMIT) return

    if (set.size === n) {
      if (minEdgeNeighborsInSet(set) >= MIN_NEIGHBORS) {
        const flats = [...set]
          .map((k) => {
            const [r, c] = parseKey(k)
            return r * s + c
          })
          .sort((a, b) => a - b)
        const sig = flats.join(',')
        if (!bySig.has(sig)) {
          bySig.set(sig, boardFromSortedFlats(flats, s))
        }
      }
      return
    }

    const frontier: string[] = []
    const seen = new Set<string>()
    for (const k of set) {
      const [r, c] = parseKey(k)
      for (const [dr, dc] of DIRS) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= s || nc < 0 || nc >= s) continue
        const nk = key(nr, nc)
        if (!set.has(nk) && !seen.has(nk)) {
          seen.add(nk)
          frontier.push(nk)
        }
      }
    }
    frontier.sort()
    for (const nk of frontier) {
      set.add(nk)
      await dfs(set)
      set.delete(nk)
    }
  }

  for (let flat = 0; flat < T; flat++) {
    if (signal?.aborted) return
    const r = Math.floor(flat / s)
    const c = flat % s
    await dfs(new Set([key(r, c)]))
  }
}

async function collectBoardsForSquareSide(
  s: number,
  n: number,
  bySig: Map<string, BoardConfiguration>,
  signal: AbortSignal | undefined,
  yieldEvery: number,
): Promise<void> {
  const T = s * s
  if (T < n) return

  const kChoose = Math.min(n, T - n)
  const binom = countBinomialCapped(T, kChoose, MAX_EXHAUSTIVE_COMBINATIONS + 1)

  if (binom !== null && binom <= MAX_EXHAUSTIVE_COMBINATIONS) {
    await exhaustiveEnumerateInSquare(s, n, bySig, signal, yieldEvery)
  } else {
    await dfsEnumerateInSquare(s, n, bySig, signal, yieldEvery)
  }
}

/**
 * Valid boards live in the smallest square s×s with s = ceil(sqrt(n)), then s+1… if needed.
 * All connected layouts with ≥2 edge neighbors per tile are considered; top picks maximize
 * total in-shape neighbor count. Uses exhaustive combinations when tractable, else bounded DFS.
 */
export async function getBoardConfigurationChoicesAsync(
  n: number,
  signal?: AbortSignal,
  yieldEvery: number = GRID_COMPUTE_YIELD_EVERY,
): Promise<BoardConfiguration[]> {
  if (n < MIN_PLAYERS) return []

  await yieldToMain()
  if (signal?.aborted) return []

  const bySig = new Map<string, BoardConfiguration>()
  const s0 = minimalSquareSide(n)

  for (let delta = 0; delta <= MAX_SQUARE_EXPANSION; delta++) {
    const s = s0 + delta
    await yieldToMain()
    if (signal?.aborted) return []

    await collectBoardsForSquareSide(s, n, bySig, signal, yieldEvery)
    if (bySig.size > 0) break
  }

  return finalizeBoardChoices(bySig)
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
