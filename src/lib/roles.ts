/**
 * Space roles, lowest to highest. Kept free of app imports so the permission
 * rule can be unit-tested with `node --test`.
 */
export type SpaceRole = "observer" | "member" | "admin";

const ROLE_RANK: Record<SpaceRole, number> = { observer: 0, member: 1, admin: 2 };

/** True if `role` is at least `minRole`. Unknown roles never pass. */
export function hasSpaceRole(role: string | null | undefined, minRole: SpaceRole): boolean {
  if (!role || !(role in ROLE_RANK)) return false;
  return ROLE_RANK[role as SpaceRole] >= ROLE_RANK[minRole];
}
