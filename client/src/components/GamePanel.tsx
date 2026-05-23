import "./GamePanel.css";
import type { GameInfo } from "@gamenite/shared";
import { gameNames } from "../util/consts.ts";
import LoadingSpinner from "./LoadingSpinner.tsx";
import useLoginContext from "../hooks/useLoginContext.ts";
import GameDispatch from "../games/GameDispatch.tsx";
import useSocketsForGame from "../hooks/useSocketsForGame.ts";
import useTimeSince from "../hooks/useTimeSince.ts";
import UserLink from "./UserLink.tsx";

/**
 * A game panel allows viewing the status and players of a live game
 */
export default function GamePanel({
  gameId,
  tournamentId,
  type,
  players: initialPlayers,
  createdAt,
  minPlayers,
}: GameInfo) {
  const { user } = useLoginContext();
  const timeSince = useTimeSince();

  const { view, players, userPlayerIndex, hasWatched, isLoading, joinGame, startGame } =
    useSocketsForGame(gameId, initialPlayers);

  if (isLoading || !hasWatched) {
    return <LoadingSpinner label="Loading game state..." />;
  }

  return (
    <div className="gamePanel pageSurface">
      <div className="gameRoster">
        <div className="gameRosterHeader">
          <div>
            <h2>{gameNames[type]}</h2>
            <div className="smallAndGray">Game room created {timeSince(createdAt)}</div>
          </div>
          <div className="gameRosterActions">
            {userPlayerIndex < 0 && !view && (
              <button className="primary narrow" onClick={joinGame}>
                Join Game
              </button>
            )}
            {userPlayerIndex >= 0 && !view && players.length >= minPlayers && (
              <button className="primary narrow" onClick={startGame}>
                Start Game
              </button>
            )}
          </div>
        </div>
        <div className="dottedList" role="list">
          {players.map((player, index) => (
            <div className="dottedListItem" role="listitem" key={player.username}>
              {player.username === user.username ? (
                `you are player #${index + 1}`
              ) : (
                <span>
                  Player #{index + 1} is <UserLink user={player} />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      {view ? (
        <div className="gameFrame">
          <GameDispatch
            gameId={gameId}
            userPlayerIndex={userPlayerIndex}
            players={players}
            view={view}
          />
        </div>
      ) : (
        <div className="gameFrame waiting content">Waiting for game to begin</div>
      )}
    </div>
  );
}
