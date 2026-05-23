import "./SideBarNav.css";
import { NavLink, type NavLinkRenderProps } from "react-router-dom";
import { FaGamepad, FaHouse, FaTrophy, FaUser } from "react-icons/fa6";
import { HiChatBubbleLeftRight } from "react-icons/hi2";
import { MdLeaderboard } from "react-icons/md";
import { IoSettingsSharp } from "react-icons/io5";
import useAuth from "../hooks/useAuth.ts";

/**
 * The SideBarNav component contains the primary naviagation menu. It
 * highlights the currently selected page and triggers navigation when the
 * menu items are clicked.
 */
export default function SideBarNav() {
  const { username } = useAuth();
  const items = [
    { to: "/", label: "Home", hint: "Overview", icon: FaHouse },
    { to: "/games", label: "Games", hint: "Live matches", icon: FaGamepad },
    { to: "/tournaments", label: "Tournaments", hint: "Brackets", icon: FaTrophy },
    { to: "/leaderboard", label: "Leaderboard", hint: "Rankings", icon: MdLeaderboard },
    { to: "/forum", label: "Forum", hint: "Community", icon: HiChatBubbleLeftRight },
    { to: `/profile/${username}`, label: "Profile", hint: "Identity", icon: FaUser },
    { to: "/settings", label: "Settings", hint: "Themes", icon: IoSettingsSharp },
  ] as const;

  /**
   * Maps the router's active state to the sidebar button classes.
   */
  const navClass = ({ isActive }: NavLinkRenderProps) =>
    `menu_button ${isActive ? "menu_selected" : ""}`;

  return (
    <nav className="sideBarNav" aria-label="Primary navigation">
      <div className="sideBarHeader">
        <span className="sideBarEyebrow">Command Lineup</span>
        <p>Move between matches, rankings, tournaments, and community spaces.</p>
      </div>
      <div className="sideBarLinks">
        {items.map(({ to, label, hint, icon: Icon }) => (
          <NavLink key={to} to={to} className={navClass}>
            <span className="menu_icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="menu_copy">
              <span className="menu_label">{label}</span>
              <span className="menu_hint">{hint}</span>
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
