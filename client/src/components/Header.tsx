import useLoginContext from "../hooks/useLoginContext.ts";
import "./Header.css";
import { useNavigate } from "react-router-dom";

/**
 * Header component that renders the main title.
 */
export default function Header() {
  const { user, reset } = useLoginContext();
  const navigate = useNavigate();

  /**
   * Renders either the user's uploaded avatar or an initial-based fallback.
   */
  const renderHeaderAvatar = () => {
    if (user.picture) {
      return (
        <img src={user.picture} alt={`${user.display}'s profile`} className="headerAvatarImage" />
      );
    }

    return <span className="headerAvatarFallback">{user.display.charAt(0).toUpperCase()}</span>;
  };

  return (
    <header id="header" className="header">
      <button className="brandLockup" onClick={() => navigate("/")}>
        <span className="brandMark" aria-hidden="true">
          <img src="/favicon.png" alt="VQ" className="brandLogo" />
        </span>
        <span className="brandText">
          <span className="title">VersusHQ</span>
          <span className="headerTagline">Live brackets, games, and community play</span>
        </span>
      </button>

      <div className="headerActions">
        <div className="headerIdentity">
          <div className="headerAvatar" aria-hidden={Boolean(user.picture)}>
            {renderHeaderAvatar()}
          </div>
          <div className="headerIdentityText">
            <span className="headerIdentityLabel">Signed in as</span>
            <strong>{user.display}</strong>
          </div>
        </div>
        <button className="narrow secondary" onClick={() => navigate(`/profile/${user.username}`)}>
          View Profile
        </button>
        <button
          className="narrow primary"
          onClick={() => {
            reset();
            navigate("/login");
          }}
        >
          Log Out
        </button>
      </div>
    </header>
  );
}
