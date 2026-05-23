import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { BracketNode, SafeUserInfo, TournamentBracket } from "@gamenite/shared";
import "./TournamentBracketView.css";

// Sizes of braket nodes
const CARD_W = 220;
const CARD_H = 72;
const SLOT_H = 36;
const COL_GAP = 100;
const ROW_GAP = 48;

const HEADER_SPACE = 60;
const TOP_PADDING = 30;

/**
 * Computes the maximum depth of the tournament bracket tree.
 */
function getDepth(node: BracketNode): number {
  if (!node.children) return 1;
  return 1 + Math.max(getDepth(node.children[0]), getDepth(node.children[1]));
}

/**
 * Groups bracket nodes by round for layout and match-number generation.
 */
function collectRounds(node: BracketNode, ri: number, rounds: BracketNode[][]): void {
  if (node.children) {
    collectRounds(node.children[0], ri - 1, rounds);
    collectRounds(node.children[1], ri - 1, rounds);
  }
  if (!rounds[ri]) rounds[ri] = [];
  rounds[ri].push(node);
}

/**
 * Shortens long player names so they fit inside a bracket slot.
 */
function truncateName(name: string, limit: number = 22) {
  return name.length > limit ? name.substring(0, limit - 3) + "..." : name;
}

/**
 * Builds human-readable round labels from the number of rounds in the bracket.
 */
function getRoundLabels(roundCount: number): string[] {
  const labels: string[] = [];
  for (let i = 0; i < roundCount; i++) {
    const remaining = roundCount - i - 1;
    if (remaining === 0) labels.push("Finals");
    else if (remaining === 1) labels.push("Semifinals");
    else if (remaining === 2) labels.push("Quarterfinals");
    else labels.push(`Round of ${Math.pow(2, remaining + 1)}`);
  }
  return labels;
}

/**
 * Draws the tournament bracket as an interactive SVG with clickable matches.
 */
export default function TournamentBracketView({ bracket }: { bracket: TournamentBracket | null }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!bracket)
    return (
      <div style={{ color: "#888", padding: 24 }}>
        Bracket will appear once the tournament starts.
      </div>
    );

  const depth = getDepth(bracket.root);
  const rawRounds: BracketNode[][] = [];
  collectRounds(bracket.root, depth - 1, rawRounds);
  const rounds = rawRounds.filter(Boolean);

  const roundLabels = getRoundLabels(rounds.length);

  // Numbering matches
  let matchCounter = 1;
  const matchNumberMap = new Map<string, number>();
  rounds.forEach((round) => {
    round.forEach((node) => {
      matchNumberMap.set(node.matchId, matchCounter++);
    });
  });

  const positions = new Map<string, number>();
  const leafCount = rounds[0].length;

  const bracketHeight = leafCount * (CARD_H + ROW_GAP);
  const svgH = bracketHeight + HEADER_SPACE + TOP_PADDING * 2;
  const offsetY = HEADER_SPACE + (svgH - HEADER_SPACE - bracketHeight) / 2;

  /**
   * Calculates and stores the vertical position for each node in the tree.
   */
  function computeY(node: BracketNode, ri: number): number {
    if (!node.children) {
      const idx = rounds[0].indexOf(node);
      const y = offsetY + idx * (CARD_H + ROW_GAP);
      positions.set(node.matchId, y);
      return y;
    }
    const y0 = computeY(node.children[0], ri - 1);
    const y1 = computeY(node.children[1], ri - 1);
    const y = (y0 + y1) / 2;
    positions.set(node.matchId, y);
    return y;
  }

  computeY(bracket.root, depth - 1);

  // Generate connecting lines
  const svgW = rounds.length * (CARD_W + COL_GAP);

  const lines: React.ReactElement[] = [];
  rounds.forEach((round, ri) => {
    round.forEach((node) => {
      if (node.children) {
        const parentX = ri * (CARD_W + COL_GAP);
        const parentY = (positions.get(node.matchId) ?? 0) + CARD_H / 2;

        node.children.forEach((child) => {
          const childX = (ri - 1) * (CARD_W + COL_GAP) + CARD_W;
          const childY = (positions.get(child.matchId) ?? 0) + CARD_H / 2;
          const midX = childX + COL_GAP / 2;

          lines.push(
            <polyline
              key={`${node.matchId}-${child.matchId}`}
              points={`${childX},${childY} ${midX},${childY} ${midX},${parentY} ${parentX},${parentY}`}
              className="bracket-line"
            />,
          );
        });
      }
    });
  });

  return (
    <div className="bracket-container" style={{ overflowX: "auto" }}>
      <svg width={svgW} height={svgH} className="bracket-svg">
        {/* Display round labels at top of bracket */}
        {rounds.map((_, ri) => {
          const x = ri * (CARD_W + COL_GAP) + CARD_W / 2;
          return (
            <text
              key={ri}
              x={x}
              y={HEADER_SPACE - 20}
              className="round-label"
              style={{ fontWeight: "bold", fontSize: "1.1rem" }}
            >
              {roundLabels[ri]}
            </text>
          );
        })}
        {lines}
        {/* Render the positioned match cards for each round. */}
        {rounds.map((round, ri) =>
          round.map((node) => {
            const x = ri * (CARD_W + COL_GAP);
            const y = positions.get(node.matchId) ?? 0;
            const [p1, p2] = node.players;
            const isHovered = hovered === node.matchId;

            /**
             * Renders one player row inside a match card.
             */
            const slot = (p: SafeUserInfo | null, isTop: boolean) => {
              const isWinner = p && p.username === node.winner?.username;

              return (
                <g key={isTop ? "top" : "bot"}>
                  <rect
                    x={x}
                    y={y + (isTop ? 0 : SLOT_H)}
                    width={CARD_W}
                    height={SLOT_H}
                    className={`player-slot ${isWinner ? "winner" : ""}`}
                  />
                  <text
                    x={x + 12}
                    y={y + (isTop ? SLOT_H / 2 : SLOT_H + SLOT_H / 2)}
                    dominantBaseline="central"
                    className={`player-text ${!p ? "empty" : isWinner ? "winner" : ""}`}
                    style={{ fontSize: "0.95rem" }}
                  >
                    {isWinner ? "👑 " : ""}
                    {p ? truncateName(p.display) : "TBD"}
                  </text>
                </g>
              );
            };

            const matchNumber = matchNumberMap.get(node.matchId);
            return (
              <g
                key={node.matchId}
                className="match-group"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(node.matchId)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(`/game/${node.matchId}`)}
              >
                <rect
                  x={x}
                  y={y}
                  width={CARD_W}
                  height={CARD_H}
                  className={`match-rect ${isHovered ? "hovered" : ""}`}
                />
                <line
                  x1={x}
                  y1={y + SLOT_H}
                  x2={x + CARD_W}
                  y2={y + SLOT_H}
                  className="match-divider"
                />

                {slot(p1, true)}
                {slot(p2, false)}

                <text
                  x={x}
                  y={y - 10}
                  className="match-label"
                  style={{ fontSize: "0.85rem", fontWeight: "bold" }}
                >
                  Match #{matchNumber}
                </text>
              </g>
            );
          }),
        )}
      </svg>
    </div>
  );
}
