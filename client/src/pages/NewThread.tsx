import useNewThreadForm from "../hooks/useNewThreadForm.ts";

/**
 * Screen for creating a new forum thread.
 */
export default function NewThread() {
  const { title, contents, err, handleInputChange, handleSubmit } = useNewThreadForm();

  return (
    <form className="content" onSubmit={handleSubmit}>
      <div className="pageShell">
        <section className="pageSurface pageHeader">
          <span className="pageEyebrow">Community Post</span>
          <h2 className="pageTitle">Create new post</h2>
          <p className="pageIntro">
            Start a discussion, share strategy, or post a tournament update for the community.
          </p>
        </section>
        <section className="pageSurface formShell">
          <div className="tightSection">
            <div className="smallAndGray">Title</div>
            <input
              className="notTooWide widefill"
              value={title}
              onChange={(e) => handleInputChange(e, "title")}
            />
          </div>
          <div className="tightSection">
            <div className="smallAndGray">Post contents</div>
            <textarea
              className="notTooWide"
              style={{ minHeight: "10rem" }}
              value={contents}
              onChange={(e) => handleInputChange(e, "contents")}
            ></textarea>
          </div>
          {err && <p className="error-message">{err}</p>}
          <div>
            <button className="primary narrow">Create</button>
          </div>
        </section>
      </div>
    </form>
  );
}
