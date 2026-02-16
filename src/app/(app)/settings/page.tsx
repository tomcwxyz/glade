import { getCurrentSpace, requireUser } from "@/lib/space";
import { getSpaceMembers } from "@/lib/queries";
import { isAiAvailable, isAiEnabled } from "@/lib/ai";
import { Settings } from "lucide-react";
import { SpaceSettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return null;

  const members = await getSpaceMembers(space.id);
  const currentMember = members.find((m) => m.userId === user.id || m.email === user.email);
  const isAdmin = currentMember?.role === "admin";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10">
        <div className="flex items-center gap-2.5 mb-1.5">
          <Settings size={20} className="text-bark-muted" />
          <h1
            className="text-3xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Space Settings
          </h1>
        </div>
        <p className="text-bark-muted">
          Manage settings for {space.name}
        </p>
      </header>

      <SpaceSettingsForm
        name={space.name}
        description={space.description || ""}
        slug={space.slug}
        isAdmin={isAdmin}
        aiAvailable={isAiAvailable()}
        aiEnabled={isAiEnabled(space.settings)}
      />
    </div>
  );
}
