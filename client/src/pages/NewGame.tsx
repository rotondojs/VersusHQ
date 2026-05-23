import useNewGameForm from "../hooks/useNewGameForm.ts";
import { gameNames } from "../util/consts.ts";

/**
 * New-game screen for choosing a game mode and any mode-specific options.
 */
export default function NewGame() {
  const { gameKey, opponentType, handleGameChange, handleOpponentTypeChange, err, handleSubmit } =
    useNewGameForm();

  return (
    <form className="content" onSubmit={handleSubmit}>
      <div className="pageShell">
        <section className="pageSurface pageHeader">
          <span className="pageEyebrow">Match Setup</span>
          <h2 className="pageTitle">Create new game</h2>
          <p className="pageIntro">Choose a mode and launch a fresh room in seconds.</p>
        </section>
        <section className="pageSurface formShell">
          <div className="tightSection">
            <div className="smallAndGray">Game mode</div>
            <select value={gameKey} aria-label="Game selection" onChange={handleGameChange}>
              <option value="">Select a game</option>
              {Object.entries(gameNames).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          {gameKey === "battleship" && (
            <div className="tightSection">
              <div className="smallAndGray">Opponent</div>
              <select
                value={opponentType}
                aria-label="Opponent selection"
                onChange={handleOpponentTypeChange}
              >
                <option value="">Select opponent</option>
                <option value="human">Human</option>
                <option value="ai">AI</option>
              </select>
            </div>
          )}
          {err && <p className="error-message">{err}</p>}
          <div>
            <button className="primary narrow">Create New Game</button>
          </div>
        </section>
      </div>
    </form>
  );
}
