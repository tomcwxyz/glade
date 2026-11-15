import { isNull, sql } from "drizzle-orm";
import { actions, decisions } from "@/db/schema";

/**
 * Soft-delete filters. A deleted decision (decisions.deleted_at set) is hidden
 * from every read except an admin opening it directly, so it can be restored.
 */

/** Use in WHERE / JOIN conditions on `decisions`. */
export const decisionNotDeleted = isNull(decisions.deletedAt);

/**
 * Use in WHERE on `actions`: hides actions whose decision has been deleted
 * (the old hard delete cascaded them away). Meeting-only actions are kept.
 */
export const actionDecisionNotDeleted = sql`not exists (select 1 from ${decisions} where ${decisions.id} = ${actions.decisionId} and ${decisions.deletedAt} is not null)`;
