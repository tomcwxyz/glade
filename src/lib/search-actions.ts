"use server";

import { searchSpace, type SearchResult } from "@/lib/queries";
import { requireSpaceRole } from "@/lib/space";

/** Space-scoped global search for the command palette. Any member (observer+). */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const auth = await requireSpaceRole("observer");
  if ("error" in auth) return [];
  return searchSpace(auth.space.id, q);
}
