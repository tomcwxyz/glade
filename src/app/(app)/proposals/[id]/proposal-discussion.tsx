"use client";

import { useState } from "react";
import { addProposalComment } from "@/lib/proposal-actions";
import { Loader2, MessageSquare, Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string | null;
  parentId: string | null;
  createdAt: string;
  replies?: Comment[];
}

export function ProposalDiscussion({
  proposalId,
  comments,
}: {
  proposalId: string;
  comments: Comment[];
}) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmitComment() {
    if (!newComment.trim()) return;
    setLoading(true);
    await addProposalComment(proposalId, newComment);
    setNewComment("");
    setLoading(false);
  }

  async function handleSubmitReply(parentId: string) {
    if (!replyContent.trim()) return;
    setLoading(true);
    await addProposalComment(proposalId, replyContent, parentId);
    setReplyContent("");
    setReplyingTo(null);
    setLoading(false);
  }

  function formatCommentDate(isoString: string) {
    return new Date(isoString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <h2
        className="text-lg font-medium tracking-tight mb-4"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Discussion
        {comments.length > 0 && (
          <span className="text-bark-muted font-normal text-sm ml-2">
            ({comments.length} comment{comments.length !== 1 ? "s" : ""})
          </span>
        )}
      </h2>

      {/* Comment form */}
      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts on this proposal…"
          rows={3}
          className="w-full px-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmitComment}
            disabled={loading || !newComment.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
          >
            {loading && !replyingTo ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Comment"
            )}
          </button>
        </div>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare size={32} className="mx-auto mb-3 text-bark-muted/30" />
          <p className="text-sm text-bark-muted">No comments yet. Be the first to contribute.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentCard
                comment={comment}
                onReply={() => {
                  setReplyingTo(comment.id);
                  setReplyContent("");
                }}
                formatDate={formatCommentDate}
              />

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-8 mt-2 space-y-2 border-l-2 border-border pl-4">
                  {comment.replies.map((reply) => (
                    <CommentCard
                      key={reply.id}
                      comment={reply}
                      formatDate={formatCommentDate}
                      isReply
                    />
                  ))}
                </div>
              )}

              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className="ml-8 mt-2 border-l-2 border-canopy/30 pl-4">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply…"
                    rows={2}
                    autoFocus
                    className="w-full px-3 py-2 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors resize-none"
                  />
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={loading || !replyContent.trim()}
                      className="px-3 py-1.5 text-xs bg-canopy text-paper rounded-md font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
                    >
                      {loading && replyingTo === comment.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        "Reply"
                      )}
                    </button>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="px-3 py-1.5 text-xs text-bark-muted hover:text-bark transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  onReply,
  formatDate,
  isReply = false,
}: {
  comment: {
    id: string;
    content: string;
    authorName: string | null;
    createdAt: string;
  };
  onReply?: () => void;
  formatDate: (d: string) => string;
  isReply?: boolean;
}) {
  return (
    <div className={cn("bg-paper-warm rounded-lg border border-border", isReply ? "p-3" : "p-4")}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn("font-medium text-bark", isReply ? "text-xs" : "text-sm")}>
          {comment.authorName || "Anonymous"}
        </span>
        <span className="text-xs text-bark-muted/60">
          {formatDate(comment.createdAt)}
        </span>
      </div>
      <p className={cn("text-bark whitespace-pre-wrap", isReply ? "text-xs leading-relaxed" : "text-sm leading-relaxed")}>
        {comment.content}
      </p>
      {onReply && (
        <button
          onClick={onReply}
          className="flex items-center gap-1 mt-2 text-xs text-bark-muted hover:text-canopy transition-colors"
        >
          <Reply size={12} />
          Reply
        </button>
      )}
    </div>
  );
}
