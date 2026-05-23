import "./Home.css";
import { useNavigate } from "react-router-dom";
import { FaGamepad, FaTrophy } from "react-icons/fa6";
import { HiChatBubbleLeftRight } from "react-icons/hi2";
import { MdLeaderboard } from "react-icons/md";

const HOME_SECTIONS = [
  {
    title: "Games",
    description: "Create match rooms, jump back into live play, and keep momentum moving.",
    icon: FaGamepad,
    path: "/games",
    tone: "games",
  },
  {
    title: "Leaderboard",
    description: "Track form, rankings, and who is climbing the fastest right now.",
    icon: MdLeaderboard,
    path: "/leaderboard",
    tone: "leaderboard",
  },
  {
    title: "Tournaments",
    description: "Run brackets, manage participants, and keep every match in one command view.",
    icon: FaTrophy,
    path: "/tournaments",
    tone: "tournaments",
  },
  {
    title: "Forum",
    description: "Keep the community talking between matches, events, and bracket updates.",
    icon: HiChatBubbleLeftRight,
    path: "/forum",
    tone: "forum",
  },
] as const;

/**
 * Marketing-style home page that highlights the main destinations in the app.
 */
export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="content">
      <div className="pageShell homePage">
        <section className="pageSurface homeHero">
          <div className="homeHeroCopy">
            <span className="pageEyebrow">Clash. Chat. Climb.</span>
            <h1 className="homeHeroTitle">One arena. Every round.</h1>
            <p className="homeHeroText">
              Start matches, run brackets, and keep hosts, players, and spectators in one shared
              arena.
            </p>
            <div className="homeHeroActions">
              <button className="primary narrow" onClick={() => navigate("/tournament/new")}>
                Start a Tournament
              </button>
              <button className="secondary narrow" onClick={() => navigate("/games")}>
                Join Live Play
              </button>
            </div>
          </div>

          <div className="homeHeroStats" aria-label="VersusHQ quick overview">
            <div className="homeStatCard">
              <span>Live Play</span>
              <strong>Now</strong>
              <p>Jump into matches and chat while the action is happening.</p>
            </div>
            <div className="homeStatCard">
              <span>Brackets</span>
              <strong>Moving</strong>
              <p>Run rounds, track results, and keep every matchup visible.</p>
            </div>
            <div className="homeStatCard homeStatCard-community">
              <span>Community</span>
              <strong>Together</strong>
              <p>Players, hosts, and spectators stay connected beyond the match.</p>
            </div>
          </div>
        </section>

        <section className="pageHeader pageSurface homeSectionHeader">
          <span className="pageEyebrow">Core Spaces</span>
          <div className="pageTitleRow">
            <div className="homeSectionLead">
              <h2 className="pageTitle homeSectionTitle">Everything important, one move away.</h2>
              <p className="homeSectionMeta">
                <strong>Game rooms</strong> for live match starts. <strong>Bracket flow</strong>{" "}
                that stays easy to follow. <strong>Shared spaces</strong> for hosts, players, and
                spectators.
              </p>
            </div>
          </div>
        </section>

        <section className="homeGrid" aria-label="Main destinations">
          {HOME_SECTIONS.map(({ title, description, icon: Icon, path, tone }) => (
            <button
              key={title}
              className={`homePanel homePanel-${tone}`}
              onClick={() => navigate(path)}
            >
              <span className="homePanelIcon" aria-hidden="true">
                <Icon />
              </span>
              <div className="homePanelCopy">
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}
