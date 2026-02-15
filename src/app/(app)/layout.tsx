import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentSpace, getUserSpaces, getSpaceMemberCount } from "@/lib/space";

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

  const userSpaces = await getUserSpaces();
  const memberCount = await getSpaceMemberCount(space.id);

  return (
    <AppShell
      currentSpace={{ ...space, memberCount }}
      userSpaces={userSpaces}
    >
      {children}
    </AppShell>
  );
}
