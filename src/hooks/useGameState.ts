import { useCallback, useMemo, useState } from 'react'
import type { CellAssignment, GameConfig, LobbyPlayerDraft, PlayerId } from '../types/game'
import {
  buildRandomAssignment,
  canStartGame,
  getBoardConfigurationChoices,
  lobbyDraftsToPlayers,
} from '../lib/layout'

function newDraft(): LobbyPlayerDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    initialCategory: '',
  }
}

export function useGameState() {
  const [phase, setPhase] = useState<'lobby' | 'game'>('lobby')
  const [drafts, setDrafts] = useState<LobbyPlayerDraft[]>(() => [
    newDraft(),
    newDraft(),
    newDraft(),
    newDraft(),
  ])
  const [selectedBoardId, setSelectedBoardId] = useState('')
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null)
  const [assignment, setAssignment] = useState<CellAssignment>({})

  const playerCount = drafts.length
  const boardChoices = useMemo(
    () => getBoardConfigurationChoices(playerCount),
    [playerCount],
  )

  const effectiveBoardId = useMemo(() => {
    if (boardChoices.length === 0) return ''
    return boardChoices.some((b) => b.id === selectedBoardId)
      ? selectedBoardId
      : boardChoices[0]!.id
  }, [boardChoices, selectedBoardId])

  const startAllowed = canStartGame(playerCount, boardChoices, effectiveBoardId)

  const addPlayer = useCallback(() => {
    setDrafts((d) => [...d, newDraft()])
  }, [])

  const removePlayer = useCallback((id: PlayerId) => {
    setDrafts((d) => (d.length <= 1 ? d : d.filter((p) => p.id !== id)))
  }, [])

  const updateDraft = useCallback(
    (id: PlayerId, patch: Partial<Pick<LobbyPlayerDraft, 'name' | 'initialCategory'>>) => {
      setDrafts((d) => d.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    },
    [],
  )

  const startGame = useCallback(() => {
    const board = boardChoices.find((b) => b.id === effectiveBoardId)
    if (!canStartGame(playerCount, boardChoices, effectiveBoardId) || !board) return
    const players = lobbyDraftsToPlayers(drafts)
    const assign = buildRandomAssignment(players, board.cellIndices.length)
    setGameConfig({
      rows: board.rows,
      cols: board.cols,
      cellIndices: [...board.cellIndices],
      players,
    })
    setAssignment(assign)
    setPhase('game')
  }, [boardChoices, drafts, effectiveBoardId, playerCount])

  const backToLobby = useCallback(() => {
    setPhase('lobby')
    setGameConfig(null)
    setAssignment({})
  }, [])

  const swapCellsForPlayers = useCallback(
    (slotIndex: number, otherPlayerId: PlayerId) => {
      setAssignment((prev) => {
        const a = prev[slotIndex]
        if (a === undefined) return prev
        const otherSlot = Object.keys(prev).find((k) => prev[Number(k)] === otherPlayerId)
        if (otherSlot === undefined) return prev
        const j = Number(otherSlot)
        return { ...prev, [slotIndex]: otherPlayerId, [j]: a }
      })
    },
    [],
  )

  const setPlayerCategoryFromInitial = useCallback(
    (playerId: PlayerId, sourceInitialCategory: string) => {
      setGameConfig((c) => {
        if (!c) return c
        return {
          ...c,
          players: c.players.map((p) =>
            p.id === playerId ? { ...p, currentCategory: sourceInitialCategory } : p,
          ),
        }
      })
    },
    [],
  )

  return {
    phase,
    drafts,
    boardChoices,
    effectiveBoardId,
    setSelectedBoardId,
    startAllowed,
    addPlayer,
    removePlayer,
    updateDraft,
    startGame,
    backToLobby,
    gameConfig,
    assignment,
    swapCellsForPlayers,
    setPlayerCategoryFromInitial,
    playerCount,
  }
}
