import { useState } from "react";
import useLoginContext from "../hooks/useLoginContext";
import useTimeSince from "../hooks/useTimeSince";
import useEditProfileForm from "../hooks/useEditProfileForm";
import "./UpdateProfile.css";

/**
 * Profile editor for the signed-in user.
 */
export default function UpdateProfile() {
  const { user, googleId } = useLoginContext();
  const timeSince = useTimeSince();
  const [showPass, setShowPass] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const {
    display,
    setDisplay,
    email,
    setEmail,
    name,
    setName,
    bio,
    setBio,
    password,
    setPassword,
    confirm,
    setConfirm,
    err,
    handleSubmit,
    handleSelectedFile,
  } = useEditProfileForm();

  /**
   * Loads a preview for the selected image and stores the file for later upload.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPreviewImage(dataUrl);
        handleSelectedFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const displayPicture = previewImage || user.picture;

  return (
    <form className="content" onSubmit={handleSubmit}>
      <div className="pageShell">
        <section className="pageSurface pageHeader">
          <span className="pageEyebrow">Account Studio</span>
          <h2 className="pageTitle">Profile</h2>
          <p className="pageIntro">
            Update the identity other players see across matches, tournaments, and the forum.
          </p>
          <div className="profileEditorMeta smallAndGray">
            <span>Username: {user.username}</span>
            <span>Account created {timeSince(user.createdAt)}</span>
          </div>
        </section>

        <section className="pageSurface formShell">
          <div className="profileEditorSection">
            <h3>Profile Picture</h3>
            {displayPicture && (
              <div className="profileEditorPreview">
                <img src={displayPicture} alt="Profile preview" />
              </div>
            )}
            <div className="profileEditorRow">
              <input
                className="widefill notTooWide"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              <button
                className="secondary narrow"
                onClick={(e) => {
                  e.preventDefault();
                  setPreviewImage(null);
                  handleSelectedFile(null);
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="profileEditorSection">
            <h3>Display name</h3>
            <div className="profileEditorRow">
              <input
                className="widefill notTooWide"
                value={display}
                onChange={(e) => setDisplay(e.target.value)}
              />
              <button
                className="secondary narrow"
                onClick={(e) => {
                  e.preventDefault();
                  setDisplay(user.display);
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="profileEditorSection">
            <h3>Name</h3>
            <div className="profileEditorRow">
              <input
                className="widefill notTooWide"
                value={name ?? ""}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                className="secondary narrow"
                onClick={(e) => {
                  e.preventDefault();
                  setName(user.name);
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="profileEditorSection">
            <h3>Bio</h3>
            <div className="profileEditorColumn">
              <textarea
                className="widefill notTooWide profileEditorTextarea"
                value={bio ?? ""}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                maxLength={500}
                placeholder="Tell other players a little about yourself."
              />
              <div className="profileEditorRow">
                <button
                  className="secondary narrow"
                  onClick={(e) => {
                    e.preventDefault();
                    setBio(user.bio);
                  }}
                >
                  Reset
                </button>
                <div className="smallAndGray">{(bio ?? "").length}/500</div>
              </div>
            </div>
          </div>

          {!googleId && (
            <>
              <div className="profileEditorSection">
                <h3>Email</h3>
                <div className="profileEditorRow">
                  <input
                    className="widefill notTooWide"
                    value={email ?? ""}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    className="secondary narrow"
                    onClick={(e) => {
                      e.preventDefault();
                      setEmail(user.email);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="profileEditorSection">
                <h3>Reset password</h3>
                <div className="profileEditorRow">
                  <input
                    type={showPass ? "text" : "password"}
                    className="widefill notTooWide"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="secondary narrow"
                    onClick={(e) => {
                      e.preventDefault();
                      setPassword("");
                      setConfirm("");
                    }}
                  >
                    Reset
                  </button>
                  <button
                    className="secondary narrow"
                    aria-label="Toggle show password"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPass((v) => !v);
                    }}
                  >
                    {showPass ? "Hide" : "Reveal"}
                  </button>
                </div>
                <div className="profileEditorRow">
                  <input
                    type={showPass ? "text" : "password"}
                    className="widefill notTooWide"
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {err && <p className="error-message">{err}</p>}
          <div className="profileEditorActions">
            <button className="primary narrow">Submit</button>
            <div className="smallAndGray">After updating your profile, you will be logged out.</div>
          </div>
        </section>
      </div>
    </form>
  );
}
