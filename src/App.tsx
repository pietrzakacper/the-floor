import { useGameState } from './hooks/useGameState'
import { LobbyScreen } from './components/LobbyScreen'
import { GameScreen } from './components/GameScreen'
import './styles/game-ui.css'

function App() {
  const {
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
    backToLobby,
    gameConfig,
    assignment,
    assignPlayerToSlot,
    setPlayerCategoryFromInitial,
  } = useGameState()

  if (phase === 'game' && gameConfig) {
    return (
      <GameScreen
        config={gameConfig}
        assignment={assignment}
        onBack={backToLobby}
        assignPlayerToSlot={assignPlayerToSlot}
        setPlayerCategoryFromInitial={setPlayerCategoryFromInitial}
      />
    )
  }

  return (
    <LobbyScreen
      drafts={drafts}
      boardChoices={boardChoices}
      boardChoicesLoading={boardChoicesLoading}
      selectedBoardId={effectiveBoardId}
      onSelectBoard={setSelectedBoardId}
      startAllowed={startAllowed}
      onAddPlayer={addPlayer}
      onRemovePlayer={removePlayer}
      onUpdateDraft={updateDraft}
      onStart={startGame}
    />
  )
}

export default App
