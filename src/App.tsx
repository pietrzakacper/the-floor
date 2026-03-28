import { useGameState } from './hooks/useGameState'
import { GameScreen } from './components/GameScreen'
import { IntroScreen } from './components/IntroScreen'
import { LobbyScreen } from './components/LobbyScreen'
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
    setPlayerCategoryFromPlayer,
    finishIntro,
  } = useGameState()

  if (phase === 'intro' && gameConfig) {
    return (
      <IntroScreen config={gameConfig} assignment={assignment} onStart={finishIntro} />
    )
  }

  if (phase === 'game' && gameConfig) {
    return (
      <GameScreen
        config={gameConfig}
        assignment={assignment}
        onBack={backToLobby}
        assignPlayerToSlot={assignPlayerToSlot}
        setPlayerCategoryFromPlayer={setPlayerCategoryFromPlayer}
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
