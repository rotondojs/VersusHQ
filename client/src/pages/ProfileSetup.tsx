import { useState } from "react";
import "./ProfileSetup.css";
import useProfileSetupForm from "../hooks/useProfileSetupForm";
import useLoginContext from "../hooks/useLoginContext";

/**
 * Renders a profile setup form with inputs for name, display name, picture, and email.
 */
export default function ProfileSetup() {
  const {
    handleInputChange,
    handleSelectedFile,
    handleSubmit,
    display,
    email,
    name,
    bio,
    picture,
    err,
  } = useProfileSetupForm();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { googleId } = useLoginContext();

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

  const displayPicture = previewImage || picture;

  return (
    <div className="profile-setup-container">
      <div className="profile-setup-box">
        <span className="pageEyebrow">VersusHQ Identity</span>
        <h1>Complete Your Profile</h1>
        <p className="profile-setup-intro">
          Add the details other players will see when you join games, tournaments, and forum
          discussions.
        </p>

        {displayPicture && (
          <div className="profile-image-preview-wrapper">
            <div className="profile-image-preview">
              <img src={displayPicture} alt="Profile preview" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="picture">Profile Picture</label>
            <input id="picture" type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="form-group">
            <label htmlFor="display">Display Name</label>
            <input
              id="display"
              type="text"
              value={display ?? ""}
              onChange={(e) => handleInputChange(e, "display")}
              placeholder="How you appear to other users"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name ?? ""}
              onChange={(e) => handleInputChange(e, "name")}
              placeholder="Your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={bio ?? ""}
              onChange={(e) => handleInputChange(e, "bio")}
              placeholder="Tell other players a little about yourself"
              rows={5}
              maxLength={500}
            />
            <div className="profile-setup-meta">{(bio ?? "").length}/500</div>
          </div>

          {!googleId && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email ?? ""}
                onChange={(e) => handleInputChange(e, "email")}
                placeholder="your.email@example.com"
              />
            </div>
          )}

          {err && <div className="error-message">{err}</div>}

          <button type="submit" className="submit-button">
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
}
