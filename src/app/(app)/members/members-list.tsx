"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Shield, ShieldCheck, Eye, X, UserPlus } from "lucide-react";
import { updateMemberRole, removeMember, inviteMember } from "@/lib/space-actions";

interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  joinedAt: string;
}

const ROLE_CONFIG: Record<
  string,
  { label: string; icon: typeof Shield; color: string }
> = {
  admin: { label: "Admin", icon: ShieldCheck, color: "text-canopy" },
  member: { label: "Member", icon: Shield, color: "text-bark-muted" },
  observer: { label: "Observer", icon: Eye, color: "text-bark-muted/60" },
};

const ROLES = ["admin", "member", "observer"] as const;

export function MembersList({
  members,
  currentUserId,
  isAdmin,
  canInvite = true,
}: {
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
  canInvite?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleRoleChange(memberId: string, role: "admin" | "member" | "observer") {
    startTransition(async () => {
      await updateMemberRole(memberId, role);
      router.refresh();
    });
  }

  function handleRemove(memberId: string) {
    if (!confirm("Remove this member from the space?")) return;
    startTransition(async () => {
      await removeMember(memberId);
      router.refresh();
    });
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteMessage(null);

    startTransition(async () => {
      const result = await inviteMember(inviteEmail.trim());
      if (result?.error) {
        setInviteMessage({ type: "error", text: result.error });
      } else {
        setInviteMessage({ type: "success", text: result?.message || "Done!" });
        setInviteEmail("");
        router.refresh();
      }
    });
  }

  return (
    <div className={isPending ? "opacity-60 pointer-events-none" : ""}>
      {/* Invite section */}
      {isAdmin && (
        <div className="mb-8">
          {!canInvite && (
            <p className="text-xs text-bark-muted mb-3">
              Member limit reached on your current plan.{" "}
              <a href="/settings" className="text-canopy hover:underline">Upgrade</a> to add more.
            </p>
          )}
          {!showInvite ? (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              disabled={!canInvite}
              className="flex items-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <UserPlus size={16} />
              Add member
            </button>
          ) : (
            <form onSubmit={handleInvite} className="p-4 bg-paper-warm rounded-xl border border-border">
              <h3 className="text-sm font-medium text-bark mb-3">Add a member by email</h3>
              {inviteMessage && (
                <div
                  className={`mb-3 px-3 py-2 rounded-lg text-sm ${
                    inviteMessage.type === "error"
                      ? "bg-earth/8 border border-earth/20 text-earth"
                      : "bg-canopy-pale border border-canopy/20 text-canopy"
                  }`}
                >
                  {inviteMessage.text}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  aria-required="true"
                  className="flex-1 px-4 py-2.5 text-sm bg-paper border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2.5 text-sm font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-60"
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInvite(false);
                    setInviteMessage(null);
                  }}
                  className="px-3 py-2.5 text-sm text-bark-muted hover:text-bark transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-bark-muted mt-2">
                If they already have a Glade account, they&apos;ll be added immediately. Otherwise, they&apos;ll receive an invitation email.
              </p>
            </form>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="space-y-1">
        {members.map((member) => {
          const config = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
          const RoleIcon = config.icon;
          const isCurrentUser = member.userId === currentUserId;

          return (
            <div
              key={member.id}
              className="flex items-center gap-4 py-4 border-b border-border last:border-b-0"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-paper-deep border border-border flex items-center justify-center text-sm font-medium text-bark-muted shrink-0">
                {(member.name || member.email[0])
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-bark truncate">
                    {member.name || member.email}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[0.625rem] uppercase tracking-wider text-bark-muted/60 font-medium">
                      You
                    </span>
                  )}
                </div>
                <div className="text-xs text-bark-muted truncate">
                  {member.email}
                </div>
              </div>

              {/* Role */}
              {isAdmin && !isCurrentUser ? (
                <select
                  value={member.role}
                  onChange={(e) =>
                    handleRoleChange(
                      member.id,
                      e.target.value as "admin" | "member" | "observer"
                    )
                  }
                  className="px-2.5 py-1.5 text-xs bg-paper-warm border border-border rounded-lg text-bark-muted focus:outline-none focus:border-canopy transition-colors"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_CONFIG[r].label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
                  <RoleIcon size={14} />
                  {config.label}
                </div>
              )}

              {/* Remove button */}
              {isAdmin && !isCurrentUser && (
                <button
                  type="button"
                  onClick={() => handleRemove(member.id)}
                  className="text-bark-muted hover:text-earth transition-colors"
                  title="Remove member"
                  aria-label="Remove member"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
