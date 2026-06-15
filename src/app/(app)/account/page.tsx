import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/space";
import { UserCircle } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { ChangePasswordForm } from "../settings/change-password-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const sessionUser = await requireUser();
  const [u] = await db
    .select({ name: users.name, email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);
  if (!u) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10">
        <div className="flex items-center gap-2.5 mb-1.5">
          <UserCircle size={20} className="text-bark-muted" />
          <h1
            className="text-3xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your account
          </h1>
        </div>
        <p className="text-bark-muted">Manage your profile and password.</p>
      </header>

      <section className="mb-12 pb-10 border-b border-border">
        <h2
          className="text-xl font-light tracking-tight mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Profile
        </h2>
        <ProfileForm name={u.name || ""} email={u.email} />
      </section>

      {u.passwordHash && (
        <section>
          <h2
            className="text-xl font-light tracking-tight mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Password
          </h2>
          <ChangePasswordForm />
        </section>
      )}
    </div>
  );
}
