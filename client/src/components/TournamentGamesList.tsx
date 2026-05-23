import { Link } from "react-router-dom";
import "./TournamentBracketView.css";
import type { BracketNode, TournamentBracket } from "@gamenite/shared";

/**
 * Converts a bracket player entry into a readable label.
 */
function playerLabel(player: BracketNode["players"][number]) {
  return player ? player.display : "TBD";
}

/**
 * Recursively renders a bracket tree as an indented list of matches.
 */
function RenderBracketNode({
  node,
  depth = 0,
  matchMap,
}: {
  node: BracketNode;
  depth?: number;
  matchMap: Map<string, number>;
}) {
  const matchNumber = matchMap.get(node.matchId);

  return (
    <div className="tournamentBracketNode" style={{ marginLeft: `${depth}rem` }}>
      <Link to={`/game/${node.matchId}`} className="match-list-link">
        <div className="match-content">
          {/* Wrapped match number in a span for blue styling */}
          <strong className="match-number-blue">Match #{matchNumber}:</strong>{" "}
          {playerLabel(node.players[0])} <span className="vs-text">vs</span>{" "}
          {playerLabel(node.players[1])}
        </div>
        {node.winner && <div className="winner-label">Winner: {node.winner.display}</div>}
      </Link>

      {node.children && (
        <div className="tournamentBracketChildren">
          <RenderBracketNode node={node.children[0]} depth={depth + 1} matchMap={matchMap} />
          <RenderBracketNode node={node.children[1]} depth={depth + 1} matchMap={matchMap} />
        </div>
      )}
    </div>
  );
}

/**
 * Renders a bracket as a linked list of matches for compact viewing.
 */
export default function TournamentListView({ bracket }: { bracket: TournamentBracket | null }) {
  if (!bracket) {
    return <div className="smallAndGray">Bracket will appear once the tournament starts.</div>;
  }

  const matchMap = new Map<string, number>();
  let counter = 1;

  /**
   * Traverses the tree in round order to assign display match numbers.
   */
  const collect = (n: BracketNode) => {
    if (n.children) {
      collect(n.children[0]);
      collect(n.children[1]);
    }
    matchMap.set(n.matchId, counter++);
  };
  collect(bracket.root);

  return (
    <div className="tournamentBracket list-mode">
      <RenderBracketNode node={bracket.root} matchMap={matchMap} />
    </div>
  );
}
