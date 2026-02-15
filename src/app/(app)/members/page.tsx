import { getCurrentSpace, requireUser } from "@/lib/space";
import { getSpaceMembers } from "@/lib/queries";
import { Users } from "lucide-react";
import { MembersList } from "./members-list";

export default async function MembersPage() {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return null;

  const members = await getSpaceMembers(space.id);
  const currentMember = members.find((m) => m.userId === user.id || m.email === user.email);
  const isAdmin = currentMember?.role === "admin";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10">
        <div className="flex items-center gap-2.5 mb-1.5">
          <Users size={20} className="text-bark-muted" />
          <h1
            className="text-3xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Members
          </h1>
        </div>
        <p className="text-bark-muted">
          {members.length} member{members.length !== 1 ? "s" : ""} in {space.name}
        </p>
      </header>

      <MembersList
        members={members.map((m) => ({
          id: m.id,
          userId: m.userId,
          name: m.name,
          email: m.email,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        }))}
        currentUserId={user.id!}
        isAdmin={isAdmin}
      />
    </div>
  );
}
