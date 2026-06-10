"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { meetings, insights } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
import { canUseAi } from "@/lib/billing";
import { isAiEnabled, generateText } from "@/lib/ai";
import { SYSTEM_PROMPT, meetingSummaryPrompt } from "@/lib/ai-prompts";
import { getMeetingById } from "@/lib/queries";
import type { MeetingSessionState } from "@/lib/meeting-state";

export async function generateMeetingSummary(meetingId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;
  if (!(await canUseAi(space.id))) return { error: "AI features require a Canopy plan" };
  if (!isAiEnabled(space.settings)) return { error: "AI features are not enabled" };

  const meeting = await getMeetingById(space.id, meetingId);
  if (!meeting) return { error: "Meeting not found" };

  const sessionState = meeting.sessionState as MeetingSessionState | null;

  const meetingJson = JSON.stringify({
    title: meeting.title,
    date: meeting.date.toISOString().split("T")[0],
    type: meeting.type,
    status: meeting.status,
    attendees: meeting.attendees.map((a) => a.name),
    agendaItems: meeting.agendaItems.map((item, i) => ({
      title: item.title,
      type: item.type,
      description: item.description,
      durationMinutes: item.durationMinutes,
      completed: sessionState?.completedItems[i] || null,
    })),
    decisions: meeting.decisions.map((d) => ({
      number: d.number,
      title: d.title,
      method: d.method,
      status: d.status,
    })),
    completedItems: sessionState?.completedItems || {},
    notes: meeting.notes,
  });

  const response = await generateText(
    SYSTEM_PROMPT,
    meetingSummaryPrompt(meetingJson),
    { maxTokens: 2000 }
  );

  // Remove old meeting summary insight
  const old = await db
    .select({ id: insights.id })
    .from(insights)
    .where(
      and(
        eq(insights.spaceId, space.id),
        eq(insights.type, "briefing"),
        eq(insights.relatedDecisionId, meetingId) // repurpose field for meeting reference
      )
    );

  for (const o of old) {
    await db.delete(insights).where(eq(insights.id, o.id));
  }

  await db.insert(insights).values({
    spaceId: space.id,
    type: "briefing",
    title: `Meeting summary: ${meeting.title}`,
    content: response,
    status: "active",
    metadata: { subtype: "meeting_summary", meetingId },
  });

  return { content: response };
}
