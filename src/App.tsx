import { useGameState } from './hooks/useGameState'
import { LobbyScreen } from './components/LobbyScreen'
import { GameScreen } from './components/GameScreen'
import './styles/game-ui.css'

function App() {
  const {
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
  } = useGameState()

  if (phase === 'game' && gameConfig) {
    return (
      <GameScreen
        config={gameConfig}
        assignment={assignment}
        onBack={backToLobby}
        swapCellsForPlayers={swapCellsForPlayers}
        setPlayerCategoryFromInitial={setPlayerCategoryFromInitial}
      />
    )
  }

  return (
    <LobbyScreen
      drafts={drafts}
      boardChoices={boardChoices}
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
