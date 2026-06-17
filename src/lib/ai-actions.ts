"use server";

import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { insights, decisions, documents } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
import { isAiEnabled, generateText, generateStructured, capInput } from "@/lib/ai";
import { canUseAi } from "@/lib/billing";
import {
  SYSTEM_PROMPT,
  patternAnalysisPrompt,
  reviewQuestionsPrompt,
  documentImpactPrompt,
  memberBriefingPrompt,
  staleDocumentPrompt,
  draftDocumentUpdatePrompt,
  governanceDigestPrompt,
  governanceQaPrompt,
  agendaDraftPrompt,
  tagSuggestionPrompt,
  transcriptExtractionPrompt,
} from "@/lib/ai-prompts";
import { getDecisions, getDocuments, getDecisionByNumber, getActions, getDocumentById, getMeetingById, getProposals, getAvailableTopics, getDecisionsList, getSpaceTags } from "@/lib/queries";
import { tiptapToText } from "@/lib/tiptap-utils";

/** Friendly error string from a thrown AI/SDK error. */
function aiError(e: unknown): { error: string } {
  return { error: e instanceof Error ? e.message : "AI request failed" };
}

// JSON Schemas for structured outputs (object top-level, additionalProperties:false,
// every property required — per the structured-outputs constraints).
const PATTERN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["patterns"],
  properties: {
    patterns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "content", "relatedDecisionNumber"],
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          relatedDecisionNumber: { type: ["integer", "null"] },
        },
      },
    },
  },
} as const;

const DOC_IMPACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["documentTitle", "reason"],
        properties: {
          documentTitle: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
} as const;

const STALE_DOC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["documents"],
  properties: {
    documents: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["documentTitle", "documentId", "reason", "relatedDecisionNumbers"],
        properties: {
          documentTitle: { type: "string" },
          documentId: { type: "string" },
          reason: { type: "string" },
          relatedDecisionNumbers: { type: "array", items: { type: "integer" } },
        },
      },
    },
  },
} as const;

const TRANSCRIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["decisions", "actions", "topics", "summary"],
  properties: {
    decisions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "method", "outcome"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          method: {
            type: "string",
            enum: ["consent", "majority_vote", "advice_process", "delegation", "consensus", "lazy_consensus"],
          },
          outcome: { type: "string" },
        },
      },
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["description", "ownerName", "dueDate"],
        properties: {
          description: { type: "string" },
          ownerName: { type: ["string", "null"] },
          dueDate: { type: ["string", "null"] },
        },
      },
    },
    topics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "type"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          type: { type: "string", enum: ["question", "tension", "agenda_suggestion"] },
        },
      },
    },
    summary: { type: "string" },
  },
} as const;

const AGENDA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "type", "durationMinutes"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          type: { type: "string", enum: ["for_decision", "for_discussion", "for_information"] },
          durationMinutes: { type: "integer" },
        },
      },
    },
  },
} as const;

async function checkAiEnabled() {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return { error: auth.error, space: null };
  const { space } = auth;
  if (!(await canUseAi(space.id))) return { error: "AI features require a Canopy plan", space: null };
  if (!isAiEnabled(space.settings)) return { error: "AI features are not enabled", space: null };
  return { error: null, space };
}

export async function dismissInsight(insightId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  await db
    .update(insights)
    .set({ status: "dismissed" })
    .where(and(eq(insights.id, insightId), eq(insights.spaceId, space.id)));

  revalidatePath("/dashboard");
}

export async function analysePatterns() {
  const { error, space } = await checkAiEnabled();
  if (error || !space) return { error: error || "No space" };

  const allDecisions = await getDecisions(space.id);
  if (allDecisions.length === 0) return { error: "No decisions to analyse" };

  const decisionsJson = JSON.stringify(
    allDecisions.map((d) => ({
      number: d.number,
      title: d.title,
      description: d.description,
      method: d.method,
      status: d.status,
      date: d.date.toISOString().split("T")[0],
      tags: d.tags,
      actionsCount: d.actionsCount,
      actionsComplete: d.actionsComplete,
    }))
  );

  let parsed: Array<{
    title: string;
    content: string;
    relatedDecisionNumber: number | null;
  }>;
  try {
    const result = await generateStructured<{ patterns: typeof parsed }>(
      SYSTEM_PROMPT,
      patternAnalysisPrompt(capInput(decisionsJson)),
      PATTERN_SCHEMA
    );
    parsed = result.patterns;
  } catch (e) {
    return aiError(e);
  }

  // Remove old pattern insights for this space
  const oldInsights = await db
    .select({ id: insights.id })
    .from(insights)
    .where(and(eq(insights.spaceId, space.id), eq(insights.type, "pattern")));

  for (const old of oldInsights) {
    await db.delete(insights).where(eq(insights.id, old.id));
  }

  // Look up decision IDs from numbers
  for (const insight of parsed) {
    let relatedDecisionId: string | null = null;
    if (insight.relatedDecisionNumber) {
      const dec = await getDecisionByNumber(space.id, insight.relatedDecisionNumber);
      if (dec) relatedDecisionId = dec.id;
    }

    await db.insert(insights).values({
      spaceId: space.id,
      type: "pattern",
      title: insight.title,
      content: insight.content,
      relatedDecisionId,
      status: "active",
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function generateReviewQuestions(decisionId: string) {
  const { error, space } = await checkAiEnabled();
  if (error || !space) return { error: error || "No space" };

  // Check for cached review insight
  const [existing] = await db
    .select({ id: insights.id, content: insights.content })
    .from(insights)
    .where(
      and(
        eq(insights.spaceId, space.id),
        eq(insights.type, "review"),
        eq(insights.relatedDecisionId, decisionId),
        eq(insights.status, "active")
      )
    )
    .limit(1);

  if (existing) return { content: existing.content };

  const [decision] = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)))
    .limit(1);

  if (!decision) return { error: "Decision not found" };

  const decisionJson = JSON.stringify({
    number: decision.number,
    title: decision.title,
    description: decision.description,
    rationale: decision.rationale,
    outcome: decision.outcome,
    method: decision.method,
    status: decision.status,
    date: decision.date.toISOString().split("T")[0],
    conditions: decision.conditions,
  });

  let response: string;
  try {
    response = await generateText(SYSTEM_PROMPT, reviewQuestionsPrompt(decisionJson));
  } catch (e) {
    return aiError(e);
  }

  await db.insert(insights).values({
    spaceId: space.id,
    type: "review",
    title: `Review questions for #${decision.number}`,
    content: response,
    relatedDecisionId: decisionId,
    status: "active",
  });

  revalidatePath(`/decisions/${decision.number}`);
  return { content: response };
}

export async function suggestDocumentUpdates(decisionId: string) {
  const { error, space } = await checkAiEnabled();
  if (error || !space) return { error: error || "No space" };

  const [decision] = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)))
    .limit(1);

  if (!decision) return { error: "Decision not found" };

  const allDocs = await getDocuments(space.id);

  const decisionJson = JSON.stringify({
    number: decision.number,
    title: decision.title,
    description: decision.description,
    rationale: decision.rationale,
    outcome: decision.outcome,
  });

  const docsJson = JSON.stringify(
    allDocs.map((d) => ({
      title: d.title,
      type: d.type,
      status: d.status,
    }))
  );

  let suggestions: Array<{ documentTitle: string; reason: string }>;
  try {
    const result = await generateStructured<{ suggestions: typeof suggestions }>(
      SYSTEM_PROMPT,
      documentImpactPrompt(decisionJson, capInput(docsJson)),
      DOC_IMPACT_SCHEMA
    );
    suggestions = result.suggestions;
  } catch (e) {
    return aiError(e);
  }

  // Store as insight
  await db.insert(insights).values({
    spaceId: space.id,
    type: "suggestion",
    title: `Document impact for #${decision.number}`,
    content: JSON.stringify(suggestions),
    relatedDecisionId: decisionId,
    status: "active",
  });

  revalidatePath(`/decisions/${decision.number}`);
  return { suggestions };
}

export async function askGovernanceQuestion(question: string) {
  const { error, space } = await checkAiEnabled();
  if (error || !space) return { error: error || "No space" };

  const trimmed = question.trim();
  if (!trimmed) return { error: "Please enter a question" };

  const [allDecisions, allDocs] = await Promise.all([
    getDecisions(space.id),
    getDocuments(space.id),
  ]);

  const decisionsJson = JSON.stringify(
    allDecisions.map((d) => ({
      number: d.number,
      title: d.title,
      description: d.description,
      rationale: d.rationale,
      outcome: d.outcome,
      method: d.method,
      status: d.status,
      date: d.date.toISOString().split("T")[0],
      tags: d.tags,
    }))
  );

  const docsJson = JSON.stringify(
    allDocs.map((d) => ({ title: d.title, type: d.type, status: d.status }))
  );

  let answer: string;
  try {
    answer = await generateText(
      SYSTEM_PROMPT,
      governanceQaPrompt(capInput(trimmed, 2000), capInput(decisionsJson), capInput(docsJson)),
      { maxTokens: 1500 }
    );
  } catch (e) {
    return aiError(e);
  }

  return { answer };
}

export async function generateMemberBriefing() {
  const { error, space } = await checkAiEnabled();
  if (error || !space) return { error: error || "No space" };

  const [allDecisions, allDocs] = await Promise.all([
    getDecisions(space.id),
    getDocuments(space.id),
  ]);

  const decisionsJson = JSON.stringify(
    allDecisions.slice(0, 20).map((d) => ({
      number: d.number,
      title: d.title,
      description: d.description,
      method: d.method,
      status: d.status,
      date: d.date.toISOString().split("T")[0],
    }))
  );

  const docsJson = JSON.stringify(
    allDocs.map((d) => ({
      title: d.title,
      type: d.type,
      status: d.status,
    }))
  );

  let response: string;
  try {
    response = await generateText(
      SYSTEM_PROMPT,
      memberBriefingPrompt(capInput(decisionsJson), capInput(docsJson)),
      { maxTokens: 3000 }
    );
  } catch (e) {
    return aiError(e);
  }

  // Remove old briefing
  const old = await db
    .select({ id: insights.id })
    .from(insights)
    .where(and(eq(insights.spaceId, space.id), eq(insights.type, "briefing")));

  for (const o of old) {
    await db.delete(insights).where(eq(insights.id, o.id));
  }

  await db.insert(insights).values({
    spaceId: space.id,
    type: "briefing",
    title: "New member briefing",
    content: response,
    status: "active",
  });

  revalidatePath("/dashboard");
  return { content: response };
}

export async function flagStaleDocuments() {
  const { error, space } = await checkAiEnabled();
  if (error || !space) return { error: error || "No space" };

  const [allDocs, allDecisions] = await Promise.all([
    getDocuments(space.id),
    getDecisions(space.id),
  ]);

  if (allDocs.length === 0) return { error: "No documents to check" };
  if (allDecisions.length === 0) return { error: "No decisions to compare against" };

  const docsJson = JSON.stringify(
    allDocs.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      status: d.status,
      updatedAt: d.updatedAt.toISOString().split("T")[0],
    }))
  );

  const decisionsJson = JSON.stringify(
    allDecisions.slice(0, 30).map((d) => ({
      number: d.number,
      title: d.title,
      description: d.description,
      status: d.status,
      date: d.date.toISOString().split("T")[0],
    }))
  );

  let parsed: Array<{
    documentTitle: string;
    documentId: string;
    reason: string;
    relatedDecisionNumbers: number[];
  }>;
  try {
    const result = await generateStructured<{ documents: typeof parsed }>(
      SYSTEM_PROMPT,
      staleDocumentPrompt(capInput(docsJson), capInput(decisionsJson)),
      STALE_DOC_SCHEMA
    );
    parsed = result.documents;
  } catch (e) {
    return aiError(e);
  }

  // Remove old stale-document insights
  const oldInsights = await db
    .select({ id: insights.id })
    .from(insights)
    .where(
      and(
        eq(insights.spaceId, space.id),
        eq(insights.type, "suggestion"),
        sql`${insights.metadata}->>'subtype' = 'stale_document'`
      )
    );

  for (const old of oldInsights) {
    await db.delete(insights).where(eq(insights.id, old.id));
  }

  // Store results
  for (const item of parsed) {
    // Verify the document exists
    const doc = allDocs.find((d) => d.id === item.documentId);
    if (!doc) continue;

    await db.insert(insights).values({
      spaceId: space.id,
      type: "suggestion",
      title: `${item.documentTitle} may need review`,
      content: item.reason,
      relatedDocumentId: item.documentId,
      status: "active",
      metadata: {
        subtype: "stale_document",
        relatedDecisionNumbers: item.relatedDecisionNumbers,
      },
    });
  }

  revalidatePath("/documents");
  return { results: parsed };
}

export async function draftDocumentUpdate(decisionId: string, documentId: string) {
  const { error, space } = await checkAiEnabled();
  if (error || !space) return { error: error || "No space" };

  const [decision] = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)))
    .limit(1);

  if (!decision) return { error: "Decision not found" };

  const doc = await getDocumentById(space.id, documentId);
  if (!doc) return { error: "Document not found" };

  const documentText = doc.content
    ? tiptapToText(doc.content as Parameters<typeof tiptapToText>[0])
    : "(empty document)";

  const decisionJson = JSON.stringify({
    number: decision.number,
    title: decision.title,
    description: decision.description,
    rationale: decision.rationale,
    outcome: decision.outcome,
    method: decision.method,
    date: decision.date.toISOString().split("T")[0],
  });

  let response: string;
  try {
    response = await generateText(
      SYSTEM_PROMPT,
      draftDocumentUpdatePrompt(decisionJson, capInput(documentText)),
      { maxTokens: 3000 }
    );
  } catch (e) {
    return aiError(e);
  }

  return { content: response };
}

export async function generateGovernanceDigest() {
  const { error, space } = await checkAiEnabled();
  if (error || !space) return { error: error || "No space" };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [allDecisions, allActions, allDocs] = await Promise.all([
    getDecisions(space.id),
    getActions(space.id),
    getDocuments(space.id),
  ]);

  const recentDecisions = allDecisions.filter(
    (d) => d.date >= thirtyDaysAgo
  );

  if (recentDecisions.length === 0 && allActions.length === 0) {
    return { error: "No recent activity to summarise" };
  }

  const decisionsJson = JSON.stringify(
    recentDecisions.map((d) => ({
      number: d.number,
      title: d.title,
      description: d.description,
      method: d.method,
      status: d.status,
      date: d.date.toISOString().split("T")[0],
      reviewDate: d.reviewDate?.toISOString().split("T")[0] || null,
      actionsCount: d.actionsCount,
      actionsComplete: d.actionsComplete,
    }))
  );

  const actionsJson = JSON.stringify(
    allActions.map((a) => ({
      description: a.description,
      ownerName: a.ownerName,
      status: a.status,
      dueDate: a.dueDate?.toISOString().split("T")[0] || null,
      decisionTitle: a.decisionTitle,
    }))
  );

  const docsJson = JSON.stringify(
    allDocs.map((d) => ({
      title: d.title,
      type: d.type,
      status: d.status,
      updatedAt: d.updatedAt.toISOString().split("T")[0],
    }))
  );

  let response: string;
  try {
    response = await generateText(
      SYSTEM_PROMPT,
      governanceDigestPrompt(capInput(decisionsJson), capInput(actionsJson), capInput(docsJson)),
      { maxTokens: 3000 }
    );
  } catch (e) {
    return aiError(e);
  }

  // Remove old digest insights
  const oldInsights = await db
    .select({ id: insights.id })
    .from(insights)
    .where(
      and(
        eq(insights.spaceId, space.id),
        eq(insights.type, "briefing"),
        sql`${insights.metadata}->>'subtype' = 'digest'`
      )
    );

  for (const old of oldInsights) {
    await db.delete(insights).where(eq(insights.id, old.id));
  }

  await db.insert(insights).values({
    spaceId: space.id,
    type: "briefing",
    title: "Monthly governance digest",
    content: response,
    status: "active",
    metadata: { subtype: "digest" },
  });

  revalidatePath("/dashboard");
  return { content: response };
}

export async function suggestDecisionTags(
  title: string,
  description: string,
  rationale: string
) {
  const { error, space } = await checkAiEnabled();
  if (error || !space) return { error: error || "No space" };

  const tags = await getSpaceTags(space.id);
  if (tags.length === 0) {
    return { error: "No tags to suggest from. Create tags in Settings first." };
  }

  const decisionText = [title, description, rationale]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join("\n\n");
  if (!decisionText) return { error: "Add a title or description first." };

  const tagNames = tags.map((t) => t.name);
  // Dynamic per-space schema: the model may only return existing tag names.
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["tags"],
    properties: {
      tags: { type: "array", items: { type: "string", enum: tagNames } },
    },
  };

  try {
    const result = await generateStructured<{ tags: string[] }>(
      SYSTEM_PROMPT,
      tagSuggestionPrompt(capInput(decisionText, 4000), JSON.stringify(tagNames)),
      schema,
      { maxTokens: 512 }
    );
    const idByName = new Map(tags.map((t) => [t.name, t.id]));
    const tagIds = (result.tags || [])
      .map((n) => idByName.get(n))
      .filter((id): id is string => !!id);
    return { tagIds };
  } catch (e) {
    return aiError(e);
  }
}

export type DraftedAgendaItem = {
  title: string;
  description: string;
  type: "for_decision" | "for_discussion" | "for_information";
  durationMinutes: number;
};

export async function draftMeetingAgenda(title: string, date: string) {
  const { error, space } = await checkAiEnabled();
  if (error || !space) return { error: error || "No space" };
  if (!title.trim()) return { error: "Add a meeting title first" };

  const [proposals, topics, recentDecisions] = await Promise.all([
    getProposals(space.id),
    getAvailableTopics(space.id),
    getDecisionsList(space.id),
  ]);

  const openProposals = proposals.filter(
    (p) =>
      p.status === "draft" ||
      p.status === "open_for_discussion" ||
      p.status === "ready_for_decision"
  );

  const proposalsJson = JSON.stringify(
    openProposals.map((p) => ({ title: p.title, status: p.status, description: p.description }))
  );
  const topicsJson = JSON.stringify(
    topics.map((t) => ({ title: t.title, type: t.type, description: t.description }))
  );
  const decisionsJson = JSON.stringify(
    recentDecisions.slice(0, 10).map((d) => ({ number: d.number, title: d.title, status: d.status }))
  );

  try {
    const result = await generateStructured<{ items: DraftedAgendaItem[] }>(
      SYSTEM_PROMPT,
      agendaDraftPrompt(
        title.trim(),
        date,
        capInput(proposalsJson),
        capInput(topicsJson),
        capInput(decisionsJson)
      ),
      AGENDA_SCHEMA
    );
    return { items: result.items };
  } catch (e) {
    return aiError(e);
  }
}

export type ExtractedDecision = {
  title: string;
  description: string;
  method: string;
  outcome: string;
};

export type ExtractedAction = {
  description: string;
  ownerName: string | null;
  dueDate: string | null;
};

export type ExtractedTopic = {
  title: string;
  description: string;
  type: string;
};

export type TranscriptExtraction = {
  decisions: ExtractedDecision[];
  actions: ExtractedAction[];
  topics: ExtractedTopic[];
  summary: string;
};

export async function extractFromTranscript(
  transcript: string,
  meetingId?: string
): Promise<TranscriptExtraction | { error: string }> {
  const { error, space } = await checkAiEnabled();
  if (error || !space) return { error: error || "No space" };

  let meetingContext: string | undefined;
  if (meetingId) {
    const meeting = await getMeetingById(space.id, meetingId);
    if (meeting) {
      meetingContext = JSON.stringify({
        title: meeting.title,
        date: meeting.date.toISOString(),
        attendees: meeting.attendees.map((a) => a.name),
      });
    }
  }

  try {
    const parsed = await generateStructured<TranscriptExtraction>(
      SYSTEM_PROMPT,
      transcriptExtractionPrompt(capInput(transcript, 16000), meetingContext),
      TRANSCRIPT_SCHEMA,
      { maxTokens: 4096 }
    );
    return {
      decisions: parsed.decisions || [],
      actions: parsed.actions || [],
      topics: parsed.topics || [],
      summary: parsed.summary || "",
    };
  } catch (e) {
    return aiError(e);
  }
}
