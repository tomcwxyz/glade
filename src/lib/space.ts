import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { spaces, spaceMembers } from "@/db/schema";
import { auth } from "@/lib/auth";

// NOTE: read helpers are wrapped in React `cache()` so they run once per request
// even when several pages/actions call them. The two client-invoked mutations
// (`switchSpace`, `createSpace`) carry their own inline "use server".

/**
 * Get the current user's ID from the session, or redirect to sign-in.
 */
export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  return session.user as { id: string; name?: string | null; email?: string | null };
});

/**
 * Get the current space slug from the cookie.
 */
export const getCurrentSpaceSlug = cache(async () => {
  const cookieStore = await cookies();
  return cookieStore.get("glade-space")?.value || null;
});

/**
 * Set the current space slug in a cookie. Server-only; called from the
 * "use server" mutations below (cookie writes are allowed in that context).
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
export const getCurrentSpace = cache(async () => {
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
});

export type SpaceRole = "observer" | "member" | "admin";
const ROLE_RANK: Record<SpaceRole, number> = { observer: 0, member: 1, admin: 2 };

type Membership = {
  user: { id: string; name?: string | null; email?: string | null };
  space: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    settings: unknown;
  };
  role: SpaceRole;
};

/**
 * Resolve the current user's membership of the current space, or null if they
 * have no space selected or aren't a member of it.
 */
export const getCurrentMembership = cache(async (): Promise<Membership | null> => {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return null;

  const [membership] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(eq(spaceMembers.spaceId, space.id), eq(spaceMembers.userId, user.id))
    )
    .limit(1);

  if (!membership) return null;
  return { user, space, role: membership.role as SpaceRole };
});

/**
 * Require that the current user has at least `minRole` in the current space.
 * Returns the membership on success, or `{ error }` for the caller to return.
 *
 * Usage:
 *   const auth = await requireSpaceRole("member");
 *   if ("error" in auth) return auth;
 *   const { user, space } = auth;
 */
export async function requireSpaceRole(
  minRole: SpaceRole
): Promise<Membership | { error: string }> {
  const membership = await getCurrentMembership();
  if (!membership) {
    return { error: "No space selected, or you are not a member of it" };
  }
  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    return { error: "You don't have permission to do this" };
  }
  return membership;
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

// `createSpace` and `switchSpace` (the client-invoked mutations) live in
// `@/lib/space-actions` so this module stays a plain (server-only) module that
// can use `cache()` for the read helpers above.
