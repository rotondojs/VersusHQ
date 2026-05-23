import useLoginContext from "../hooks/useLoginContext";
import useAuth from "../hooks/useAuth";
import { THEMES, themeMetadata, useTheme } from "../contexts/ThemeContext";
import "./Settings.css";

/**
 * Settings page is accessible via /settings.
 * Currently allows the logged-in user to choose a color theme for the application.
 * The slection is persisted to their account so that it is restored on every visit.
 */
export default function Settings() {
  const { user } = useLoginContext();
  const auth = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="content">
      <div className="pageShell">
        <section className="pageSurface pageHeader">
          <span className="pageEyebrow">Preferences</span>
          <h2 className="pageTitle">Settings</h2>
          <p className="pageIntro">
            Choose the mood of the interface. Your theme preference is saved to your account.
          </p>
        </section>
        <section className="pageSurface settingsCard">
          <h3>Theme</h3>
          <p>Switch between light, dark, glacier, and sunset without changing the site flow.</p>
          <div className="themeOptions">
            {THEMES.map((t) => (
              <button
                key={t}
                className={`themeOptionCard ${theme === t ? "themeOptionCard-active" : ""}`}
                onClick={() => setTheme(t, auth)}
                aria-pressed={theme === t}
              >
                <span className="themeOptionLabel">{themeMetadata[t].label}</span>
                <span className="themeOptionDescription">{themeMetadata[t].description}</span>
              </button>
            ))}
          </div>
          <p className="smallAndGray">Signed in as {user.display}</p>
        </section>
      </div>
    </div>
  );
}
