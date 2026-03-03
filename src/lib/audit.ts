import { db } from "@/db";
import { auditLog } from "@/db/schema";

export async function logDeletion(
  spaceId: string,
  entityType: string,
  entityTitle: string,
  entityMeta: Record<string, unknown> | null,
  deletedBy: string | null,
  deletedByName: string | null
) {
  await db.insert(auditLog).values({
    spaceId,
    entityType,
    entityTitle,
    entityMeta,
    deletedBy,
    deletedByName,
  });
}
