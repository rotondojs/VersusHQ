import "./ThreadPage.css";
import { useParams } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner.tsx";
import useThreadInfo from "../hooks/useThreadInfo.ts";
import NewForumComment from "../components/NewForumComment.tsx";
import useTimeSince from "../hooks/useTimeSince.ts";
import UserLink from "../components/UserLink.tsx";

/**
 * Shows a forum thread, its replies, and the reply composer.
 */
export default function ThreadPage() {
  const formatTimeSince = useTimeSince();
  const { threadId } = useParams();

  // non-nullish assertion is okay here given that Thread is only called in a
  // route with `:threadId` on the path
  const { threadInfo, setThread, isLoading, errorMessage } = useThreadInfo(threadId!);

  return (
    <div className="content">
      {isLoading ? (
        <LoadingSpinner label="Loading post..." />
      ) : errorMessage ? (
        <div className="error-message">Error: {errorMessage}</div>
      ) : !threadInfo ? (
        <div>Thread not found.</div>
      ) : (
        <div className="pageShell spacedSection">
          <section className="pageSurface pageHeader">
            <span className="pageEyebrow">Forum Thread</span>
            <h2 className="pageTitle">{threadInfo.title}</h2>
            <div className="notTooWide threadBodyText">{threadInfo.text}</div>
            <div className="smallAndGray">
              Posted by <UserLink user={threadInfo.createdBy} />{" "}
              {formatTimeSince(threadInfo.createdAt)}
            </div>
          </section>
          <section className="pageSurface threadCommentsPanel">
            <h3>Replies</h3>
            <div className="dottedList" role="list">
              {threadInfo.comments.map(({ commentId, text, createdBy, createdAt, editedAt }) => (
                <div className="dottedListItem" role="listitem" key={commentId}>
                  <div>
                    <div>{text}</div>
                    <div className="smallAndGray">
                      Reply by <UserLink user={createdBy} />
                      {createdBy.username === threadInfo.createdBy.username && (
                        <span className="opBlue"> OP</span>
                      )}{" "}
                      {formatTimeSince(createdAt)}
                      {editedAt && ` (last edited ${formatTimeSince(editedAt)})`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="pageSurface threadComposerPanel">
            <NewForumComment
              firstPost={threadInfo.comments.length === 0}
              threadId={threadInfo.threadId.toString()}
              setThread={setThread}
            />
          </section>
        </div>
      )}
    </div>
  );
}
