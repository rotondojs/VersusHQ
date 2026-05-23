import "./TournamentPage.css";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { SafeUserInfo, TournamentInfo } from "@gamenite/shared";
import LoadingSpinner from "../components/LoadingSpinner.tsx";
import useSocketsForTournament from "../hooks/useSocketsForTournament.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import useAuth from "../hooks/useAuth.ts";
import {
  cancelTournament,
  joinTournament,
  kickPlayer,
  leaveTournament,
  startTournament,
} from "../services/tournamentService.ts";
import { tournamentGameModeNames } from "../util/consts.ts";
import UserLink from "../components/UserLink.tsx";
import TournamentListView from "../components/TournamentGamesList.tsx";
import TournamentBracketView from "../components/TournamentBracketView.tsx";
import ChatPanel from "../components/ChatPanel.tsx";
import { resolveTournamentChatRole } from "../util/tournamentChat.ts";

type Tab = "Info" | "Participants" | "Bracket" | "Podium" | "Chat";

interface RankedParticipant {
  user: SafeUserInfo;
  placement: number | null;
}

/**
 * Renders the avatar or initial shown in the tournament podium view.
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
    1: "190px",
    2: "150px",
    3: "126px",
    4: "104px",
  };

  if (placement !== null && heightsByPlacement[placement]) {
    return heightsByPlacement[placement];
  }

  const fallbackByIndex: Record<number, string> = {
    1: "190px",
    2: "150px",
    3: "126px",
    4: "104px",
  };
  return fallbackByIndex[index] ?? "96px";
}

/**
 * Main tournament detail page, including overview, participants, bracket, podium, and chat tabs.
 */
export default function TournamentPage() {
  const { tournamentId } = useParams();
  const auth = useAuth();
  const { user } = useLoginContext();
  const navigate = useNavigate();

  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Info");
  const {
    tournament: currentTournament,
    isLoading,
    errorMessage,
    setTournament,
  } = useSocketsForTournament(tournamentId ?? "");

  const showPodiumTab =
    currentTournament?.status === "completed" && Boolean(currentTournament.placements);
  const selectedTab = activeTab === "Podium" && !showPodiumTab ? "Info" : activeTab;

  if (!tournamentId) {
    return (
      <div className="content">
        <div className="pageShell">
          <div className="error-message">Tournament not found.</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner label="Loading tournament..." />;
  }

  if (errorMessage) {
    return (
      <div className="content">
        <div className="pageShell">
          <div className="error-message">Error: {errorMessage}</div>
        </div>
      </div>
    );
  }

  if (!currentTournament) {
    return (
      <div className="content">
        <div className="pageShell">
          <div className="error-message">Tournament not found.</div>
        </div>
      </div>
    );
  }

  const isHost = currentTournament.hostUser.username === user.username;
  const isParticipant = currentTournament.participants.some((p) => p.username === user.username);

  const canJoin =
    currentTournament.status === "upcoming" &&
    !isParticipant &&
    currentTournament.participants.length < currentTournament.maxPlayers;

  const canLeave = currentTournament.status === "upcoming" && isParticipant && !isHost;

  const canStart =
    isHost &&
    currentTournament.status === "upcoming" &&
    currentTournament.participants.length === currentTournament.maxPlayers;

  const canEdit = isHost && currentTournament.status === "upcoming";
  const visibleTabs: Tab[] = showPodiumTab
    ? ["Info", "Participants", "Bracket", "Chat", "Podium"]
    : ["Info", "Participants", "Bracket", "Chat"];
  const displayMode = currentTournament.resolvedGameMode ?? currentTournament.requestedGameMode;

  const rankedParticipants: RankedParticipant[] = currentTournament.participants
    .map((participant) => {
      const placementFromUserHistory = (participant.tournaments ?? []).find(
        (entry) => entry.tournamentId === currentTournament.tournamentId,
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

  /**
   * Runs a tournament mutation and writes the updated tournament back into local state.
   */
  async function runAction(action: () => Promise<TournamentInfo | { error: string }>) {
    setErr(null);
    const result = await action();
    if ("error" in result) {
      setErr(result.error);
      return;
    }
    setTournament(result);
  }

  const podiumSlots: Array<RankedParticipant | null> = [
    ...rankedParticipants.slice(0, 4),
    ...Array.from({ length: Math.max(0, 4 - rankedParticipants.length) }, () => null),
  ].slice(0, 4);

  return (
    <div className="content">
      <div className="pageShell tournamentPageShell">
        <section className="pageSurface tournamentHero">
          <div className="tournamentHeroCopy">
            <span className="pageEyebrow">Tournament Control</span>
            <div className="tournamentTitleRow">
              <h1 className="pageTitle tournamentPageTitle">{currentTournament.title}</h1>
              <span className={`status-bubble status-${currentTournament.status}`}>
                {currentTournament.status}
              </span>
            </div>
            <p className="pageIntro">
              {currentTournament.description ||
                "No description has been added for this tournament."}
            </p>
            <div className="tournamentMetaGrid">
              <div className="tournamentMetaCard">
                <span className="tournamentMetaLabel">Game mode</span>
                <strong className="tournamentMetaValue">
                  {tournamentGameModeNames[displayMode]}
                </strong>
              </div>
              <div className="tournamentMetaCard">
                <span className="tournamentMetaLabel">Players</span>
                <strong className="tournamentMetaValue">
                  {currentTournament.participants.length}/{currentTournament.maxPlayers}
                </strong>
              </div>
              <div className="tournamentMetaCard">
                <span className="tournamentMetaLabel">Starts</span>
                <strong className="tournamentMetaValue">
                  {new Date(currentTournament.startTime).toLocaleString()}
                </strong>
              </div>
              <div className="tournamentMetaCard">
                <span className="tournamentMetaLabel">Host</span>
                <strong className="tournamentMetaValue">
                  <UserLink user={currentTournament.hostUser} />
                </strong>
              </div>
            </div>
          </div>

          <div className="tournamentActions">
            {canJoin && (
              <button
                className="tournament-action-btn primary narrow"
                onClick={() =>
                  runAction(() => joinTournament(auth, currentTournament.tournamentId))
                }
              >
                Join Tournament
              </button>
            )}
            {canLeave && (
              <button
                className="tournament-action-btn secondary tournamentDanger narrow"
                onClick={() =>
                  runAction(() => leaveTournament(auth, currentTournament.tournamentId))
                }
              >
                Leave Tournament
              </button>
            )}
            {canStart && (
              <button
                className="tournament-action-btn primary narrow"
                onClick={() =>
                  runAction(() => startTournament(auth, currentTournament.tournamentId))
                }
              >
                Start Tournament
              </button>
            )}
            {canEdit && (
              <>
                <button
                  className="tournament-action-btn secondary narrow"
                  onClick={() => navigate(`/tournament/${currentTournament.tournamentId}/edit`)}
                >
                  Edit
                </button>
                <button
                  className="tournament-action-btn secondary tournamentDanger narrow"
                  onClick={() =>
                    runAction(() => cancelTournament(auth, currentTournament.tournamentId))
                  }
                >
                  Cancel Tournament
                </button>
              </>
            )}
          </div>
        </section>

        <section className="pageSurface tournamentTabs">
          <div className="tab-bar">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-button ${selectedTab === tab ? "active" : ""}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        {err && <p className="error-message">{err}</p>}

        {selectedTab === "Info" && (
          <div className="tournamentGrid">
            <section className="pageSurface tournamentPanel">
              <span className="tournamentPanelEyebrow">Overview</span>
              <h2>Details</h2>
              <p className="description-text">
                {currentTournament.description || "No description has been provided yet."}
              </p>
              <div className="details-list">
                <div>
                  <span>Game</span>
                  <strong>{tournamentGameModeNames[currentTournament.requestedGameMode]}</strong>
                </div>
                <div>
                  <span>Players</span>
                  <strong>
                    {currentTournament.participants.length} / {currentTournament.maxPlayers}
                  </strong>
                </div>
                <div>
                  <span>Start time</span>
                  <strong>{new Date(currentTournament.startTime).toLocaleString()}</strong>
                </div>
                <div>
                  <span>Host</span>
                  <strong>
                    <UserLink user={currentTournament.hostUser} />
                  </strong>
                </div>
              </div>
            </section>

            <section className="pageSurface tournamentPanel">
              <span className="tournamentPanelEyebrow">Pathing</span>
              <h2>Match List</h2>
              <TournamentListView bracket={currentTournament.bracket} />
            </section>
          </div>
        )}

        {selectedTab === "Participants" && (
          <section className="pageSurface tournamentPanel participantsTab">
            <span className="tournamentPanelEyebrow">Lineup</span>
            <h2>Participants</h2>
            <table className="participants-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  {canEdit && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {currentTournament.participants.map((participant) => (
                  <tr key={participant.username}>
                    <td>
                      <UserLink user={participant} />
                    </td>
                    <td className="role-text">
                      {participant.username === currentTournament.hostUser.username
                        ? "Host"
                        : "Player"}
                    </td>
                    <td className="text-right">
                      {canEdit && participant.username !== user.username && (
                        <button
                          className="btn-kick"
                          onClick={() =>
                            runAction(() =>
                              kickPlayer(
                                auth,
                                currentTournament.tournamentId,
                                participant.username,
                              ),
                            )
                          }
                        >
                          Kick
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {selectedTab === "Bracket" && (
          <section className="pageSurface tournamentPanel bracketTab">
            <span className="tournamentPanelEyebrow">Bracket Map</span>
            <h2>Bracket</h2>
            <TournamentBracketView bracket={currentTournament.bracket} />
          </section>
        )}

        {selectedTab === "Chat" && (
          <section className="pageSurface tournamentPanel">
            <div className="tournamentChatHeader">
              <div>
                <span className="tournamentPanelEyebrow">Tournament Chat</span>
                <h2>Shared conversation</h2>
              </div>
              <div className="tournament-chat-legend" aria-label="Tournament chat legend">
                <span className="tournament-chat-legend-item tournament-chat-legend-host">
                  Host
                </span>
                <span className="tournament-chat-legend-item tournament-chat-legend-participant">
                  Participant
                </span>
                <span className="tournament-chat-legend-item tournament-chat-legend-spectator">
                  Spectator
                </span>
              </div>
            </div>
            <div className="tournament-chat-tab">
              <ChatPanel
                chatId={currentTournament.chat}
                resolveBubbleRole={(username) =>
                  resolveTournamentChatRole(currentTournament, username)
                }
              />
            </div>
          </section>
        )}

        {selectedTab === "Podium" && showPodiumTab && (
          <div className="tournamentDetails completedTournamentDetails">
            <section className="pageSurface tournamentColumn">
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

            <section className="pageSurface tournamentColumn">
              <h3 className="podiumHeading">Rankings</h3>
              <ol className="rankingList">
                {rankedParticipants.map((entry) => (
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
        )}
      </div>
    </div>
  );
}
