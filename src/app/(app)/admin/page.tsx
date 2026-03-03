import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shield } from "lucide-react";
import { requireUser } from "@/lib/space";
import { isSuperAdmin } from "@/lib/auth";
import { getAllSpacesWithPlans, getAllUsers, getSpaceMemberCounts } from "@/lib/queries";
import { PLAN_DISPLAY } from "@/lib/plans";
import type { PlanTier } from "@/lib/plans";
import { AdminSpaceRow } from "./admin-space-row";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await requireUser();
  if (!isSuperAdmin(user.email)) return notFound();

  const [spacesWithPlans, allUsers, memberCounts] = await Promise.all([
    getAllSpacesWithPlans(),
    getAllUsers(),
    getSpaceMemberCounts(),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10">
        <div className="flex items-center gap-2.5 mb-1.5">
          <Shield size={20} className="text-bark-muted" />
          <h1
            className="text-3xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Super Admin
          </h1>
        </div>
        <p className="text-bark-muted">
          Manage all spaces and users across the platform.
        </p>
      </header>

      {/* Spaces */}
      <section className="mb-12">
        <h2
          className="text-xl font-light tracking-tight mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Spaces ({spacesWithPlans.length})
        </h2>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[0.8125rem]">
            <thead>
              <tr className="bg-paper-warm border-b border-border text-left text-bark-muted">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Slug</th>
                <th className="px-4 py-2.5 font-medium">Plan</th>
                <th className="px-4 py-2.5 font-medium text-right">Members</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {spacesWithPlans.map((space) => (
                <AdminSpaceRow
                  key={space.id}
                  space={{
                    id: space.id,
                    name: space.name,
                    slug: space.slug,
                    planTier: (space.planTier || "free") as PlanTier,
                    memberCount: memberCounts[space.id] ?? 0,
                    createdAt: space.createdAt.toISOString(),
                    hasStripe: !!space.stripeCustomerId,
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Users */}
      <section>
        <h2
          className="text-xl font-light tracking-tight mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Users ({allUsers.length})
        </h2>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[0.8125rem]">
            <thead>
              <tr className="bg-paper-warm border-b border-border text-left text-bark-muted">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5 text-bark">{u.name || "—"}</td>
                  <td className="px-4 py-2.5 text-bark-muted">{u.email}</td>
                  <td className="px-4 py-2.5 text-bark-muted">
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
