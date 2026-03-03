import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentSpace, getUserSpaces, getSpaceMemberCount, requireUser } from "@/lib/space";
import { isSuperAdmin } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const space = await getCurrentSpace();

  // If user has no spaces, redirect to creation flow
  if (!space) {
    redirect("/new-space");
  }

  const [userSpaces, memberCount, user] = await Promise.all([
    getUserSpaces(),
    getSpaceMemberCount(space.id),
    requireUser(),
  ]);

  return (
    <AppShell
      currentSpace={{ ...space, memberCount }}
      userSpaces={userSpaces}
      isSuperAdmin={isSuperAdmin(user.email)}
    >
      {children}
    </AppShell>
  );
}
