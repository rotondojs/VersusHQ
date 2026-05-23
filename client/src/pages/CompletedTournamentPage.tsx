import "./TournamentPage.css";
import type { SafeUserInfo } from "@gamenite/shared";
import useTournamentInfo from "../hooks/useTournamentInfo.ts";
import { tournamentGameModeNames } from "../util/consts.ts";
import UserLink from "../components/UserLink.tsx";
import LoadingSpinner from "../components/LoadingSpinner.tsx";

export interface CompletedTournamentPageProps {
  tournamentId: string;
}

interface RankedParticipant {
  user: SafeUserInfo;
  placement: number | null;
}

/**
 * Renders the avatar or initial shown in the completed-tournament podium.
 */
function renderAvatar(user: SafeUserInfo) {
  if (user.picture) {
    return (
      <img src={user.picture} alt={`${user.display}'s profile`} className="podiumAvatarImage" />
    );
  }

  return <span className="podiumAvatarFallback">{user.display.charAt(0).toUpperCase()}</span>;
}

/**
 * Read-only podium view for completed tournaments.
 */
export default function CompletedTournamentPage(props: CompletedTournamentPageProps) {
  const { tournamentInfo, isLoading, errorMessage } = useTournamentInfo(props.tournamentId);

  if (isLoading) {
    return <LoadingSpinner label="Loading tournament..." />;
  }

  if (errorMessage) {
    return (
      <div className="content spacedSection">
        <p className="error-message">Error: {errorMessage}</p>
      </div>
    );
  }

  if (!tournamentInfo) {
    return (
      <div className="content spacedSection">
        <p className="error-message">Tournament not found.</p>
      </div>
    );
  }

  const tournament = tournamentInfo;
  const displayMode = tournament.resolvedGameMode ?? tournament.requestedGameMode;

  if (tournament.status !== "completed" || !tournament.placements) {
    return (
      <div className="content spacedSection">
        <p className="error-message">This tournament is not completed yet.</p>
      </div>
    );
  }

  const rankedParticipants: RankedParticipant[] = tournament.participants
    .map((participant) => {
      const placementFromUserHistory = (participant.tournaments ?? []).find(
        (entry) => entry.tournamentId === tournament.tournamentId,
      );

      return {
        user: participant,
        placement: placementFromUserHistory ? placementFromUserHistory.placement : null,
      };
    })
    .sort((a, b) => {
      if (a.placement === null && b.placement === null) {
        return a.user.display.localeCompare(b.user.display);
      }
      if (a.placement === null) {
        return 1;
      }
      if (b.placement === null) {
        return -1;
      }
      if (a.placement === b.placement) {
        return a.user.display.localeCompare(b.user.display);
      }
      return a.placement - b.placement;
    });

  const podiumSlots: Array<RankedParticipant | null> = [
    ...rankedParticipants.slice(0, 4),
    ...Array.from({ length: Math.max(0, 4 - rankedParticipants.length) }, () => null),
  ].slice(0, 4);
  const remainingRanked = rankedParticipants;

  /**
   * Formats a numeric placement for podium and ranking displays.
   */
  function showPlacement(value: number | null) {
    return value === null ? "-" : `#${value}`;
  }

  /**
   * Returns a podium step height based on placement, with index-based fallbacks for empty slots.
   */
  function getPodiumHeight(placement: number | null, index: number) {
    const heightsByPlacement: Record<number, string> = {
      1: "180px",
      2: "145px",
      4: "100px",
    };

    if (placement !== null && heightsByPlacement[placement]) {
      return heightsByPlacement[placement];
    }

    const fallbackByIndex: Record<number, string> = {
      1: "180px",
      2: "145px",
      3: "120px",
      4: "100px",
    };
    return fallbackByIndex[index] ?? "90px";
  }

  return (
    <div className="content spacedSection">
      <h2>{tournament.title}</h2>
      <div className="smallAndGray">
        {tournament.status} · {tournamentGameModeNames[displayMode]} · started{" "}
        {new Date(tournament.startTime).toLocaleString()}
      </div>

      <div className="tournamentDetails completedTournamentDetails">
        <section className="tournamentColumn">
          <h3 className="podiumHeading">Podium</h3>
          <div className="podiumGrid" aria-label="Tournament podium top four">
            {podiumSlots.map((slot, index) => {
              const columnIndex = index + 1;
              const placement = slot?.placement ?? null;
              const placementClass =
                placement === null ? "podiumColumn-open" : `podiumColumn-place-${placement}`;

              return (
                <div
                  className={`podiumColumn ${placementClass}`}
                  key={`${columnIndex}-${slot?.user.username ?? "open"}`}
                >
                  <div className="podiumAvatar">
                    {slot ? renderAvatar(slot.user) : <span>-</span>}
                  </div>
                  <div className="podiumName">
                    {slot ? (
                      <UserLink user={slot.user} />
                    ) : (
                      <span className="smallAndGray">Open slot</span>
                    )}
                  </div>
                  <div
                    className="podiumStep"
                    style={{ height: getPodiumHeight(placement, columnIndex) }}
                  >
                    <div className="podiumPlace">{showPlacement(placement)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="tournamentColumn">
          <h3>Rankings</h3>
          <ol className="rankingList">
            {remainingRanked.map((entry) => (
              <li className="rankingRow" key={entry.user.username}>
                <span className="rankingPlace">{showPlacement(entry.placement)}</span>
                <span className="rankingUser">
                  <UserLink user={entry.user} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
