import type { SafeUserInfo, TournamentSummary } from "@gamenite/shared";
import { useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner.tsx";
import useTimeSince from "../hooks/useTimeSince";
import { getUserById } from "../services/userService";
import ProfileTournamentHistory from "../components/ProfileTournamentHistory";
import "./ViewProfile.css";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useLeaderboard from "../hooks/useLeaderboard";
interface ViewProfileProps {
  username: string;
}

/**
 * Public profile page for viewing another user's activity, rankings, and tournament history.
 */
export default function ViewProfile({ username }: ViewProfileProps) {
  const [componentState, setComponentState] = useState<
    { type: "waiting" } | { type: "error"; msg: string } | { type: "profile"; user: SafeUserInfo }
  >({ type: "waiting" });
  const timeSince = useTimeSince();
  const { currentUserEntry } = useLeaderboard(username, {
    limit: 0,
    gameType: null,
    dateRange: "all",
  });
  const topTenPlacement =
    currentUserEntry && currentUserEntry.rank <= 10 ? currentUserEntry.rank : null;

  /**
   * Renders the profile picture or a fallback initial for the viewed user.
   */
  function renderProfilePicture(user: SafeUserInfo) {
    if (user.picture) {
      return (
        <img src={user.picture} alt={`${user.display}'s profile`} className="profileAvatarImage" />
      );
    }

    return <span className="profileAvatarFallback">{user.display.charAt(0).toUpperCase()}</span>;
  }

  /**
   * Builds chart-ready placement data from completed tournaments.
   */
  const createTournamentStatistics = (tournaments: TournamentSummary[]) => {
    const stats = tournaments
      .filter((tournament) => tournament.placement > 0)
      .map((tournament) => {
        return {
          name: tournament.name,
          placement: tournament.placement,
        };
      });
    return stats;
  };

  /**
   * Computes summary statistics for the viewed user's tournament history.
   */
  const computeProfileStats = (tournaments: TournamentSummary[]) => {
    const played = tournaments.filter((t) => t.placement > 0);
    const wins = played.filter((t) => t.placement === 1).length;
    const hosted = tournaments.filter((t) => t.hosted).length;
    const placements = played.map((t) => t.placement);
    const bestPlacement = placements.length > 0 ? Math.min(...placements) : null;
    const avgPlacement =
      placements.length > 0
        ? (placements.reduce((a, b) => a + b, 0) / placements.length).toFixed(1)
        : null;
    const winRate = played.length > 0 ? Math.round((wins / played.length) * 100) : 0;
    return { total: played.length, wins, winRate, hosted, bestPlacement, avgPlacement };
  };

  /**
   * Builds cumulative points data for the points-over-time chart.
   */
  const createPointsHistory = (tournaments: TournamentSummary[]) => {
    let cumulative = 0;
    return tournaments
      .filter((t) => t.placement > 0)
      .map((t) => {
        const earned = Math.round((t.participantCount / Math.max(t.placement, 1)) * 100);
        cumulative += earned;
        return { name: t.name, points: cumulative };
      });
  };

  useEffect(() => {
    let cancel = false;

    getUserById(username)
      .then((response) => {
        if (cancel) return;
        if ("error" in response) {
          setComponentState({ type: "error", msg: response.error });
        } else {
          setComponentState({ type: "profile", user: response });
        }
      })
      .catch((err) => {
        if (cancel) return;
        setComponentState({ type: "error", msg: `${err}` });
      });

    return () => {
      cancel = true;
    };
  }, [username]);

  switch (componentState.type) {
    case "error":
      return <div style={{ color: "#f00" }}>{componentState.msg}</div>;
    case "waiting":
      return <LoadingSpinner label="Loading profile..." />;
    case "profile":
      return (
        <div className="content">
          <div className="pageShell spacedSection">
            <section className="pageSurface pageHeader">
              <span className="pageEyebrow">Player Profile</span>
              <h2 className="pageTitle">Profile for {componentState.user.display}</h2>
              <p className="pageIntro">
                Match history, tournament placements, and account details in one profile card.
              </p>
            </section>

            <section className="viewProfileCard pageSurface">
              <div className="profileTopRow">
                <div className="profileAvatar" aria-hidden={Boolean(componentState.user.picture)}>
                  {renderProfilePicture(componentState.user)}
                </div>
                <div className="profileTopText">
                  <div className="profileDisplayName">{componentState.user.display}</div>
                  <div className="profileUsername">{componentState.user.username}</div>
                </div>
                <div className="profilePoints" aria-label={`${componentState.user.points} points`}>
                  {componentState.user.points}
                  <span>points</span>
                  {topTenPlacement !== null && (
                    <>
                      <div className="profileLeaderboardPlacement">#{topTenPlacement}</div>
                      <span>ranking</span>
                    </>
                  )}
                </div>
              </div>

              {componentState.user.bio && (
                <div className="profileBioBlock">
                  <div className="profileBioLabel">Bio</div>
                  <p className="profileBioText">{componentState.user.bio}</p>
                </div>
              )}

              <ul className="profileMetaList">
                <li>
                  <strong>Account created:</strong> {timeSince(componentState.user.createdAt)}
                </li>
                {componentState.user.email && (
                  <li>
                    <strong>Email:</strong> {componentState.user.email}
                  </li>
                )}
              </ul>

              <div className="profileStatsSummary">
                {(() => {
                  const s = computeProfileStats(componentState.user.tournaments ?? []);
                  return (
                    <>
                      <div className="profileStatItem">
                        <span className="profileStatValue">{s.total}</span>
                        <span className="profileStatLabel">Played</span>
                      </div>
                      <div className="profileStatItem">
                        <span className="profileStatValue">{s.wins}</span>
                        <span className="profileStatLabel">Wins</span>
                      </div>
                      <div className="profileStatItem">
                        <span className="profileStatValue">{s.winRate}%</span>
                        <span className="profileStatLabel">Win Rate</span>
                      </div>
                      <div className="profileStatItem">
                        <span className="profileStatValue">{s.bestPlacement ?? "—"}</span>
                        <span className="profileStatLabel">Best Place</span>
                      </div>
                      <div className="profileStatItem">
                        <span className="profileStatValue">{s.avgPlacement ?? "—"}</span>
                        <span className="profileStatLabel">Avg Place</span>
                      </div>
                      <div className="profileStatItem">
                        <span className="profileStatValue">{s.hosted}</span>
                        <span className="profileStatLabel">Hosted</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </section>

            <section className="profileStatsRow">
              <div className="viewProfileCard profileChartPanel pageSurface">
                <h3>Tournament Placements</h3>
                <div className="profileChartWrap">
                  <ResponsiveContainer width="100%" height={360}>
                    <LineChart
                      data={createTournamentStatistics(componentState.user.tournaments ?? [])}
                    >
                      <XAxis dataKey="name" tick={{ fill: "var(--fg-secondary)", fontSize: 11 }} />
                      <YAxis reversed allowDecimals={false} tick={{ fill: "var(--fg-secondary)" }}>
                        <Label
                          value="Placement"
                          angle={-90}
                          position="insideLeft"
                          fill="var(--fg-secondary)"
                          fontSize={12}
                        />
                      </YAxis>
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface-glass)",
                          border: "1px solid var(--surface-outline)",
                        }}
                        labelStyle={{ color: "var(--fg-primary)", fontWeight: 600 }}
                      />
                      <CartesianGrid stroke="rgba(11, 45, 114, 0.12)" />
                      <ReferenceLine
                        y={1}
                        stroke="gold"
                        strokeDasharray="4 2"
                        label={{ value: "1st", fill: "gold", fontSize: 11 }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="placement"
                        name="Placement"
                        stroke="#0992C2"
                        strokeWidth={3}
                        dot={{ fill: "#0B2D72", strokeWidth: 0, r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="viewProfileCard profileChartPanel pageSurface">
                <h3>Points Over Time</h3>
                <div className="profileChartWrap">
                  <ResponsiveContainer width="100%" height={360}>
                    <AreaChart data={createPointsHistory(componentState.user.tournaments ?? [])}>
                      <XAxis dataKey="name" tick={{ fill: "var(--fg-secondary)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "var(--fg-secondary)" }}>
                        <Label
                          value="Points"
                          angle={-90}
                          position="insideLeft"
                          fill="var(--fg-secondary)"
                          fontSize={12}
                        />
                      </YAxis>
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface-glass)",
                          border: "1px solid var(--surface-outline)",
                        }}
                        labelStyle={{ color: "var(--fg-primary)", fontWeight: 600 }}
                      />
                      <CartesianGrid stroke="rgba(11, 45, 114, 0.12)" />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="points"
                        name="Cumulative Points"
                        stroke="#0992C2"
                        fill="#0992C2"
                        fillOpacity={0.15}
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="viewProfileCard profileHistoryPanel pageSurface">
                <h3>Tournament History</h3>
                {(componentState.user.tournaments ?? []).length === 0 ? (
                  <div>No tournaments yet.</div>
                ) : (
                  (componentState.user.tournaments ?? []).map((tournament) => {
                    return (
                      <ProfileTournamentHistory {...tournament} key={tournament.tournamentId} />
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      );
  }
}
