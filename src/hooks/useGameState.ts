import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BoardConfiguration } from '../lib/layout'
import type { CellAssignment, GameConfig, LobbyPlayerDraft, PlayerId } from '../types/game'
import {
  buildRandomAssignment,
  canStartGame,
  getBoardConfigurationChoicesAsync,
  lobbyDraftsToPlayers,
} from '../lib/layout'
import { useLocalState } from './useLocalState'

const LS = {
  phase: 'the-floor.phase',
  drafts: 'the-floor.drafts',
  selectedBoardId: 'the-floor.selectedBoardId',
  gameConfig: 'the-floor.gameConfig',
  assignment: 'the-floor.assignment',
} as const

function newDraft(): LobbyPlayerDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    initialCategory: '',
  }
}

export function useGameState() {
  const [phase, setPhase] = useLocalState<'lobby' | 'intro' | 'game'>(LS.phase, 'lobby')
  const [drafts, setDrafts] = useLocalState<LobbyPlayerDraft[]>(LS.drafts, () => [
    newDraft(),
    newDraft(),
    newDraft(),
    newDraft(),
  ])
  const [selectedBoardId, setSelectedBoardId] = useLocalState(LS.selectedBoardId, '')
  const [gameConfig, setGameConfig] = useLocalState<GameConfig | null>(LS.gameConfig, null)
  const [assignment, setAssignment] = useLocalState<CellAssignment>(LS.assignment, {})
  const [boardChoices, setBoardChoices] = useState<BoardConfiguration[]>([])
  const [boardChoicesLoading, setBoardChoicesLoading] = useState(true)

  useEffect(() => {
    if ((phase === 'game' || phase === 'intro') && !gameConfig) {
      setPhase('lobby')
      setAssignment({})
    }
  }, [phase, gameConfig, setPhase, setAssignment])

  const playerCount = drafts.length

  useEffect(() => {
    const ac = new AbortController()
    const rafId = requestAnimationFrame(() => {
      if (ac.signal.aborted) return
      setBoardChoicesLoading(true)
      setBoardChoices([])

      void getBoardConfigurationChoicesAsync(playerCount, ac.signal)
        .then((choices) => {
          if (ac.signal.aborted) return
          setBoardChoices(choices)
        })
        .catch(() => {
          if (!ac.signal.aborted) {
            setBoardChoices([])
          }
        })
        .finally(() => {
          if (!ac.signal.aborted) {
            setBoardChoicesLoading(false)
          }
        })
    })

    return () => {
      ac.abort()
      cancelAnimationFrame(rafId)
    }
  }, [playerCount])

  const effectiveBoardId = useMemo(() => {
    if (boardChoices.length === 0) return ''
    return boardChoices.some((b) => b.id === selectedBoardId)
      ? selectedBoardId
      : boardChoices[0]!.id
  }, [boardChoices, selectedBoardId])

  const startAllowed =
    !boardChoicesLoading &&
    canStartGame(playerCount, boardChoices, effectiveBoardId)

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
    if (boardChoicesLoading) return
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
    setPhase('intro')
  }, [boardChoices, boardChoicesLoading, drafts, effectiveBoardId, playerCount])

  const finishIntro = useCallback(() => {
    setPhase('game')
  }, [setPhase])

  const backToLobby = useCallback(() => {
    setPhase('lobby')
    setGameConfig(null)
    setAssignment({})
  }, [])

  /** Set this tile to show `playerId`. Other tiles are unchanged; a player may occupy many tiles or none. */
  const assignPlayerToSlot = useCallback((slotIndex: number, playerId: PlayerId) => {
    setAssignment((prev) => ({ ...prev, [slotIndex]: playerId }))
  }, [])

  const setPlayerCategoryFromPlayer = useCallback((playerId: PlayerId, sourcePlayerId: PlayerId) => {
    setGameConfig((c) => {
      if (!c) return c
      const source = c.players.find((x) => x.id === sourcePlayerId)
      if (!source) return c
      return {
        ...c,
        players: c.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                currentCategory: source.initialCategory,
                categorySourcePlayerId: sourcePlayerId,
              }
            : p,
        ),
      }
    })
  }, [])

  return {
    phase,
    drafts,
    boardChoices,
    boardChoicesLoading,
    effectiveBoardId,
    setSelectedBoardId,
    startAllowed,
    addPlayer,
    removePlayer,
    updateDraft,
    startGame,
    finishIntro,
    backToLobby,
    gameConfig,
    assignment,
    assignPlayerToSlot,
    setPlayerCategoryFromPlayer,
    playerCount,
  }
}
