"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { spaces, spaceMembers, users } from "@/db/schema";
import { auth } from "@/lib/auth";

/**
 * Get the current user's ID from the session, or redirect to sign-in.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  return session.user as { id: string; name?: string | null; email?: string | null };
}

/**
 * Get the current space slug from the cookie.
 */
export async function getCurrentSpaceSlug() {
  const cookieStore = await cookies();
  return cookieStore.get("glade-space")?.value || null;
}

/**
 * Set the current space slug in a cookie.
 */
export async function setCurrentSpace(slug: string) {
  const cookieStore = await cookies();
  cookieStore.set("glade-space", slug, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

/**
 * Get the current space for the logged-in user.
 * If no space is selected or user has no spaces, returns null.
 */
export async function getCurrentSpace() {
  const user = await requireUser();
  const slug = await getCurrentSpaceSlug();

  if (slug) {
    // Verify user is a member of this space
    const result = await db
      .select({
        id: spaces.id,
        name: spaces.name,
        slug: spaces.slug,
        description: spaces.description,
        settings: spaces.settings,
      })
      .from(spaces)
      .innerJoin(spaceMembers, eq(spaceMembers.spaceId, spaces.id))
      .where(and(eq(spaces.slug, slug), eq(spaceMembers.userId, user.id)))
      .limit(1);

    if (result.length > 0) return result[0];
  }

  // Fall back to user's first space
  const result = await db
    .select({
      id: spaces.id,
      name: spaces.name,
      slug: spaces.slug,
      description: spaces.description,
      settings: spaces.settings,
    })
    .from(spaces)
    .innerJoin(spaceMembers, eq(spaceMembers.spaceId, spaces.id))
    .where(eq(spaceMembers.userId, user.id))
    .limit(1);

  if (result.length > 0) {
    // Don't set cookie here — this runs during rendering (layout/page),
    // where cookies can't be modified. The cookie gets set when the user
    // explicitly switches spaces or creates one.
    return result[0];
  }

  return null;
}

/**
 * Get all spaces the current user is a member of.
 */
export async function getUserSpaces() {
  const user = await requireUser();

  return db
    .select({
      id: spaces.id,
      name: spaces.name,
      slug: spaces.slug,
      role: spaceMembers.role,
    })
    .from(spaces)
    .innerJoin(spaceMembers, eq(spaceMembers.spaceId, spaces.id))
    .where(eq(spaceMembers.userId, user.id));
}

/**
 * Get the member count for a space.
 */
export async function getSpaceMemberCount(spaceId: string) {
  const result = await db
    .select({ id: spaceMembers.id })
    .from(spaceMembers)
    .where(eq(spaceMembers.spaceId, spaceId));

  return result.length;
}

/**
 * Create a new space and add the current user as admin.
 */
export async function createSpace(formData: FormData) {
  const user = await requireUser();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  if (!name || name.trim().length === 0) {
    return { error: "Space name is required" };
  }

  // Generate slug from name
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Check slug uniqueness
  const existing = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Create space
  const [space] = await db
    .insert(spaces)
    .values({ name: name.trim(), slug, description })
    .returning({ id: spaces.id, slug: spaces.slug });

  // Add creator as admin
  await db.insert(spaceMembers).values({
    spaceId: space.id,
    userId: user.id,
    role: "admin",
  });

  // Set as current space
  await setCurrentSpace(space.slug);

  // Seed example data if requested
  const wantExampleData = formData.get("exampleData") === "on";
  if (wantExampleData) {
    const [dbUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    const { seedExampleData } = await import("@/lib/example-data");
    await seedExampleData(space.id, user.id, dbUser?.name || "You");
  }

  redirect("/dashboard");
}

/**
 * Switch to a different space.
 */
export async function switchSpace(slug: string) {
  await setCurrentSpace(slug);
  redirect("/dashboard");
}
