import "./ProfileTournamentHistory.css";
import type { TournamentSummary } from "@gamenite/shared";
import { NavLink } from "react-router-dom";

/**
 * Renders one row in a user's tournament history list.
 */
export default function ProfileTournamentHistory({
  tournamentId,
  name,
  createdAt,
  placement,
  hosted,
}: TournamentSummary) {
  return (
    <div className="profileHistory" role="listitem">
      <div className="tournament-history-info">
        <NavLink to={`/tournament/${tournamentId}`} className="mid">
          {name}
        </NavLink>
        <div>{new Date(createdAt).toLocaleString()}</div>
        <div className="label-panel">
          {hosted && <div className="hosted-label">Hosted</div>}
          {placement === 1 ? (
            <div className="won-label">Winner</div>
          ) : placement > 1 ? (
            <div className="placement-label">{placement}</div>
          ) : (
            <div className="lost-label">Participant</div>
          )}
        </div>
      </div>
    </div>
  );
}
