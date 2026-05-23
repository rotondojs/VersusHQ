/**
 * Battleship UI with placement, scorekeeping, spectator masking, and board interactions.
 */
import "./BattleshipGame.css";
import {
  BATTLESHIP_BOARD_SIZE,
  BATTLESHIP_SHIP_ORDER,
  battleshipScoreRules,
  battleshipShipSpecs,
  type BattleshipMove,
  type BattleshipOrientation,
  type BattleshipOwnCell,
  type BattleshipPlacedShip,
  type BattleshipShipKind,
  type BattleshipTargetCell,
  type BattleshipView,
} from "@gamenite/shared";
import { useState } from "react";
import type { GameProps } from "../util/types.ts";

const ROW_LABELS = Array.from({ length: BATTLESHIP_BOARD_SIZE }).map((_, index) =>
  String.fromCharCode("A".charCodeAt(0) + index),
);

const shipCodes: { [key in BattleshipShipKind]: string } = {
  carrier: "C",
  battleship: "B",
  destroyer: "D",
  submarine: "S",
  cruiser: "R",
};

/**
 * Builds a stable string key for a board coordinate.
 */
function coordinateKey(row: number, col: number): string {
  return `${row},${col}`;
}

/**
 * Expands a placed ship into the full list of occupied coordinates.
 */
function shipCells(placement: BattleshipPlacedShip) {
  return Array.from({ length: battleshipShipSpecs[placement.ship].length }).map((_, offset) => ({
    row: placement.row + (placement.orientation === "vertical" ? offset : 0),
    col: placement.col + (placement.orientation === "horizontal" ? offset : 0),
  }));
}

/**
 * Sorts a fleet into the canonical ship order used by the UI and API.
 */
function sortFleet(ships: BattleshipPlacedShip[]): BattleshipPlacedShip[] {
  return [...ships].sort(
    (left, right) =>
      BATTLESHIP_SHIP_ORDER.indexOf(left.ship) - BATTLESHIP_SHIP_ORDER.indexOf(right.ship),
  );
}

/**
 * Validates that a ship placement stays on the board and does not overlap others.
 */
function canPlaceShip(ships: BattleshipPlacedShip[], placement: BattleshipPlacedShip): boolean {
  const cells = shipCells(placement);
  if (
    cells.some(
      ({ row, col }) =>
        row < 0 || row >= BATTLESHIP_BOARD_SIZE || col < 0 || col >= BATTLESHIP_BOARD_SIZE,
    )
  ) {
    return false;
  }

  const occupied = new Set<string>();
  for (const ship of ships) {
    for (const cell of shipCells(ship)) {
      occupied.add(coordinateKey(cell.row, cell.col));
    }
  }

  return cells.every((cell) => !occupied.has(coordinateKey(cell.row, cell.col)));
}

/**
 * Builds a temporary board view from the in-progress placement draft.
 */
function buildDraftBoard(ships: BattleshipPlacedShip[]): BattleshipOwnCell[][] {
  const board: BattleshipOwnCell[][] = Array.from({ length: BATTLESHIP_BOARD_SIZE }).map(() =>
    Array.from({ length: BATTLESHIP_BOARD_SIZE }).map(() => ({ kind: "empty" as const })),
  );

  for (const ship of ships) {
    for (const cell of shipCells(ship)) {
      board[cell.row][cell.col] = { kind: "ship", ship: ship.ship };
    }
  }

  return board;
}

/**
 * Formats the picker label for a ship selection button.
 */
function shipButtonLabel(ship: BattleshipShipKind): string {
  const spec = battleshipShipSpecs[ship];
  return `${spec.label} (${spec.length})`;
}

/**
 * Converts an own-board cell into the text shown on the board button.
 */
function renderOwnCellText(cell: BattleshipOwnCell): string {
  if (!cell.ship) {
    return cell.kind === "miss" ? "o" : "";
  }
  if (cell.kind === "hit") return "X";
  if (cell.kind === "sunk") return shipCodes[cell.ship];
  return shipCodes[cell.ship];
}

/**
 * Converts a target-board cell into the text shown on the board button.
 */
function renderTargetCellText(cell: BattleshipTargetCell): string {
  if (cell.kind === "miss") return "o";
  if (cell.kind === "hit") return "X";
  if (cell.kind === "sunk" && cell.ship) return shipCodes[cell.ship];
  return "";
}

/**
 * Produces the CSS class string for a Battleship board cell.
 */
function boardCellClass(cell: { kind: string }, clickable: boolean): string {
  return `battleshipCell battleshipCell-${cell.kind} ${clickable ? "battleshipCell-clickable" : ""}`;
}

interface BoardProps<Cell extends { kind: string }> {
  title: string;
  helperText?: string;
  badge?: string;
  tone?: "active" | "idle" | "spectator";
  cells: Cell[][];
  cellText: (cell: Cell) => string;
  cellLabelPrefix: string;
  onCellClick?: (row: number, col: number) => void;
  clickable?: (row: number, col: number, cell: Cell) => boolean;
}

/**
 * Renders a single Battleship board with optional helper text and click handling.
 */
function BattleshipBoard<Cell extends { kind: string }>({
  title,
  helperText,
  badge,
  tone = "idle",
  cells,
  cellText,
  cellLabelPrefix,
  onCellClick,
  clickable,
}: BoardProps<Cell>) {
  return (
    <div className={`battleshipBoardPanel battleshipBoardPanel-${tone}`}>
      <div className="battleshipBoardHeader">
        <div>
          <h3>{title}</h3>
          {helperText && <p>{helperText}</p>}
        </div>
        {badge && <span className="battleshipBoardBadge">{badge}</span>}
      </div>
      <table className="battleshipBoard">
        <thead>
          <tr>
            <th></th>
            {Array.from({ length: BATTLESHIP_BOARD_SIZE }).map((_, index) => (
              <th key={index + 1}>{index + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cells.map((row, rowIndex) => (
            <tr key={ROW_LABELS[rowIndex]}>
              <th>{ROW_LABELS[rowIndex]}</th>
              {row.map((cell, colIndex) => {
                const isClickable = clickable ? clickable(rowIndex, colIndex, cell) : false;
                return (
                  <td key={`${rowIndex}-${colIndex}`}>
                    <button
                      type="button"
                      className={boardCellClass(cell, isClickable)}
                      onClick={() => onCellClick?.(rowIndex, colIndex)}
                      disabled={!isClickable}
                      aria-label={`${cellLabelPrefix} ${ROW_LABELS[rowIndex]}${colIndex + 1}`}
                    >
                      {cellText(cell)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Coordinates placement controls, battle status, and spectator-safe board rendering.
 */
export default function BattleshipGame({
  view,
  players,
  userPlayerIndex,
  makeMove,
}: GameProps<BattleshipView, BattleshipMove>) {
  const [orientation, setOrientation] = useState<BattleshipOrientation>("horizontal");
  const [selectedShip, setSelectedShip] = useState<BattleshipShipKind>(BATTLESHIP_SHIP_ORDER[0]);
  const [draftFleet, setDraftFleet] = useState<BattleshipPlacedShip[]>([]);
  const [placementError, setPlacementError] = useState<string | null>(null);

  const isSpectator = view.viewer === "spectator";
  const activePlayer = players[view.nextPlayer]?.display ?? `Player ${view.nextPlayer + 1}`;
  const humanCanPlace =
    view.viewer === "player" && view.phase === "placement" && !view.ready[view.playerIndex];
  const humanCanShoot =
    view.viewer === "player" && view.phase === "battle" && view.playerIndex === userPlayerIndex;
  const isYourTurn =
    view.viewer === "player" && view.phase === "battle" && view.nextPlayer === userPlayerIndex;
  const phaseLabel =
    view.phase === "placement"
      ? "Placement Phase"
      : view.phase === "battle"
        ? "Battle Phase"
        : "Game Over";
  const phaseMessage =
    view.phase === "placement"
      ? "Deploy all five ships on the 8x8 grid before the battle begins."
      : view.phase === "battle"
        ? `${activePlayer} is in command. Hits keep the turn alive.`
        : `${players[view.winner ?? 0]?.display ?? "A player"} won by sinking the entire fleet.`;
  const selectedShipSpec = battleshipShipSpecs[selectedShip];
  const placedShipsCount = draftFleet.length;

  /**
   * Checks whether the currently selected ship can be placed at a given square.
   */
  const canPlaceSelectedShipAt = (row: number, col: number) => {
    if (!humanCanPlace) return false;
    const withoutShip = draftFleet.filter((ship) => ship.ship !== selectedShip);
    return canPlaceShip(withoutShip, {
      ship: selectedShip,
      row,
      col,
      orientation,
    });
  };
  const player0Afloat = view.fleetStatus[0].filter((ship) => !ship.sunk).length;
  const player1Afloat = view.fleetStatus[1].filter((ship) => !ship.sunk).length;
  const ownBoardHelper =
    humanCanPlace && view.viewer === "player"
      ? `Placing ${selectedShipSpec.label} (${selectedShipSpec.length} spaces, ${orientation}).`
      : "Your fleet, incoming hits, and defended waters.";
  const opponentBoardHelper =
    view.viewer === "player"
      ? isYourTurn
        ? "Choose an unexplored square to fire on the hidden enemy fleet."
        : "Enemy fleet positions stay hidden until a ship is sunk."
      : "Spectators can track the battle, but ship positions stay masked.";

  /**
   * Places or repositions the selected ship in the local fleet draft.
   */
  function handlePlacement(row: number, col: number) {
    if (!humanCanPlace) return;
    const withoutShip = draftFleet.filter((ship) => ship.ship !== selectedShip);
    const candidate: BattleshipPlacedShip = {
      ship: selectedShip,
      row,
      col,
      orientation,
    };
    if (!canPlaceShip(withoutShip, candidate)) {
      setPlacementError("That ship would go out of bounds or overlap another ship.");
      return;
    }

    const nextFleet = sortFleet([...withoutShip, candidate]);
    setDraftFleet(nextFleet);
    setPlacementError(null);

    const nextShip = BATTLESHIP_SHIP_ORDER.find(
      (ship) => !nextFleet.some((placement) => placement.ship === ship),
    );
    if (nextShip) {
      setSelectedShip(nextShip);
    }
  }

  /**
   * Fires at a square on the opponent board when the current player is allowed to act.
   */
  function handleFire(row: number, col: number) {
    if (
      view.viewer !== "player" ||
      view.phase !== "battle" ||
      view.nextPlayer !== userPlayerIndex
    ) {
      return;
    }
    const cell = view.opponentBoard[row][col];
    if (cell.kind !== "unknown") return;
    makeMove({ type: "fire", row, col });
  }

  const draftBoard = humanCanPlace && view.viewer === "player" ? buildDraftBoard(draftFleet) : null;

  return (
    <div className="content spacedSection battleshipGame">
      <div className="battleshipHero">
        <div className="battleshipHeroCard battleshipHeroCard-mission">
          <div className="battleshipHeroEyebrow">Naval Command</div>
          <h2>Battleship</h2>
          <p>
            Battleship uses an 8x8 grid. Players place all five ships, then fire one shot at a time.
            A hit grants another shot; a miss ends the turn.
          </p>
        </div>
        <div className="battleshipHeroCard battleshipHeroCard-status" aria-live="polite">
          <div
            className={`battleshipPhaseBadge ${
              view.phase === "battle" ? "battleshipPhaseBadge-live" : ""
            }`}
          >
            {phaseLabel}
          </div>
          <strong>{phaseMessage}</strong>
          <span>
            {view.phase === "placement" && "Players are placing fleets."}
            {view.phase === "battle" && `Current turn: ${activePlayer}`}
            {view.phase === "done" &&
              `${players[view.winner ?? 0]?.display ?? "A player"} won by sinking the entire fleet.`}
          </span>
        </div>
      </div>

      <div className="battleshipMeta">
        <div className="battleshipScoreboard">
          <div className="battleshipCardHeader">
            <div>
              <h3>Score</h3>
              <p>Hits earn points by ship size, and sink bonuses match the ship again.</p>
            </div>
            <span className="battleshipMiniBadge">Live</span>
          </div>
          <div
            className={`battleshipScoreRow ${
              view.phase === "battle" && view.nextPlayer === 0 ? "isActive" : ""
            } ${view.phase === "done" && view.winner === 0 ? "isWinner" : ""}`}
          >
            <span>
              {players[0]?.display ?? "Player 1"}
              <small>{player0Afloat} ships afloat</small>
            </span>
            <strong>{view.scores[0]}</strong>
          </div>
          <div
            className={`battleshipScoreRow ${
              view.phase === "battle" && view.nextPlayer === 1 ? "isActive" : ""
            } ${view.phase === "done" && view.winner === 1 ? "isWinner" : ""}`}
          >
            <span>
              {players[1]?.display ?? "Player 2"}
              <small>{player1Afloat} ships afloat</small>
            </span>
            <strong>{view.scores[1]}</strong>
          </div>
          <div className="battleshipRubric">
            {BATTLESHIP_SHIP_ORDER.map((ship) => (
              <div key={ship} className="battleshipRubricRow">
                <span>{battleshipShipSpecs[ship].label}</span>
                <span>
                  +{battleshipScoreRules[ship].hit} hit / +{battleshipScoreRules[ship].sinkBonus}{" "}
                  sink
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="battleshipFleetPanels">
          <div className="battleshipFleetPanel">
            <div className="battleshipCardHeader">
              <div>
                <h3>{players[0]?.display ?? "Player 1"} fleet</h3>
                <p>{player0Afloat} ships still afloat</p>
              </div>
            </div>
            {view.fleetStatus[0].map((ship) => (
              <div
                key={ship.ship}
                className={`battleshipFleetShip ${ship.sunk ? "isSunk" : "isAfloat"}`}
              >
                <span>
                  {battleshipShipSpecs[ship.ship].label}
                  <small>{ship.length} spaces</small>
                </span>
                <strong>{ship.sunk ? "Sunk" : "Afloat"}</strong>
              </div>
            ))}
          </div>
          <div className="battleshipFleetPanel">
            <div className="battleshipCardHeader">
              <div>
                <h3>{players[1]?.display ?? "Player 2"} fleet</h3>
                <p>{player1Afloat} ships still afloat</p>
              </div>
            </div>
            {view.fleetStatus[1].map((ship) => (
              <div
                key={ship.ship}
                className={`battleshipFleetShip ${ship.sunk ? "isSunk" : "isAfloat"}`}
              >
                <span>
                  {battleshipShipSpecs[ship.ship].label}
                  <small>{ship.length} spaces</small>
                </span>
                <strong>{ship.sunk ? "Sunk" : "Afloat"}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {humanCanPlace && view.viewer === "player" && (
        <div className="battleshipPlacementControls">
          <div className="battleshipCardHeader">
            <div>
              <h3>Fleet Placement</h3>
              <p>
                {placedShipsCount} of {BATTLESHIP_SHIP_ORDER.length} ships placed. Select a ship,
                choose an orientation, then click a highlighted square.
              </p>
            </div>
            <span className="battleshipMiniBadge">
              {selectedShipSpec.label} · {selectedShipSpec.length}
            </span>
          </div>
          <div className="battleshipShipPicker">
            {BATTLESHIP_SHIP_ORDER.map((ship) => {
              const isPlaced = draftFleet.some((placement) => placement.ship === ship);
              return (
                <button
                  key={ship}
                  type="button"
                  className={`secondary narrow battleshipShipButton ${
                    selectedShip === ship ? "selectedShip" : ""
                  } ${isPlaced ? "isPlaced" : ""}`}
                  onClick={() => setSelectedShip(ship)}
                >
                  <span>{shipButtonLabel(ship)}</span>
                  <small>{isPlaced ? "Placed" : "Ready"}</small>
                </button>
              );
            })}
          </div>
          <div className="battleshipOrientation">
            <button
              type="button"
              className={`secondary narrow ${orientation === "horizontal" ? "selectedShip" : ""}`}
              onClick={() => setOrientation("horizontal")}
            >
              Horizontal
            </button>
            <button
              type="button"
              className={`secondary narrow ${orientation === "vertical" ? "selectedShip" : ""}`}
              onClick={() => setOrientation("vertical")}
            >
              Vertical
            </button>
            <button
              type="button"
              className="secondary narrow"
              onClick={() => {
                setDraftFleet([]);
                setSelectedShip(BATTLESHIP_SHIP_ORDER[0]);
                setPlacementError(null);
              }}
            >
              Reset Fleet
            </button>
            <button
              type="button"
              className="primary narrow"
              disabled={draftFleet.length !== BATTLESHIP_SHIP_ORDER.length}
              onClick={() => makeMove({ type: "placeFleet", ships: draftFleet })}
            >
              Lock Fleet
            </button>
          </div>
          {placementError && <div className="error-message">{placementError}</div>}
        </div>
      )}

      {view.phase === "placement" && view.viewer === "player" && view.ready[view.playerIndex] && (
        <div className="battleshipNotice">
          Fleet locked in. Waiting for the other player to finish placement.
        </div>
      )}
      {view.phase === "placement" && isSpectator && (
        <div className="battleshipNotice">
          Spectators can follow readiness and score, but not ship positions.
        </div>
      )}
      {view.phase === "battle" &&
        view.viewer === "player" &&
        view.nextPlayer !== userPlayerIndex && (
          <div className="battleshipNotice">Waiting for the opponent to finish their turn.</div>
        )}

      <div className="battleshipBoards">
        {view.viewer === "player" ? (
          <>
            <BattleshipBoard
              title="Your Grid"
              helperText={ownBoardHelper}
              badge={humanCanPlace ? "Deploying" : "Defending"}
              tone={humanCanPlace ? "active" : "idle"}
              cells={draftBoard ?? view.yourBoard}
              cellText={renderOwnCellText}
              cellLabelPrefix="Your grid"
              onCellClick={handlePlacement}
              clickable={(row, col) => canPlaceSelectedShipAt(row, col)}
            />
            <BattleshipBoard
              title="Opponent Grid"
              helperText={opponentBoardHelper}
              badge={isYourTurn ? "Fire" : "Hidden"}
              tone={isYourTurn ? "active" : "idle"}
              cells={view.opponentBoard}
              cellText={renderTargetCellText}
              cellLabelPrefix="Opponent grid"
              onCellClick={handleFire}
              clickable={(row, col, cell) =>
                view.phase === "battle" &&
                view.nextPlayer === userPlayerIndex &&
                humanCanShoot &&
                cell.kind === "unknown"
              }
            />
          </>
        ) : (
          <>
            <BattleshipBoard
              title={`${players[0]?.display ?? "Player 1"} Grid`}
              helperText={opponentBoardHelper}
              badge="Masked"
              tone="spectator"
              cells={view.boards[0]}
              cellText={renderTargetCellText}
              cellLabelPrefix="Player 1 grid"
            />
            <BattleshipBoard
              title={`${players[1]?.display ?? "Player 2"} Grid`}
              helperText={opponentBoardHelper}
              badge="Masked"
              tone="spectator"
              cells={view.boards[1]}
              cellText={renderTargetCellText}
              cellLabelPrefix="Player 2 grid"
            />
          </>
        )}
      </div>
    </div>
  );
}
