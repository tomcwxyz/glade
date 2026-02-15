"use server";

import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { meetings, meetingAgendaItems, meetingAttendees, meetingDecisions } from "@/db/schema";
import { getCurrentSpace, requireUser } from "@/lib/space";

export async function createMeeting(formData: FormData) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Meeting title is required" };

  const dateStr = formData.get("date") as string;
  if (!dateStr) return { error: "Date is required" };

  const type = (formData.get("type") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const attendeeIdsRaw = formData.get("attendeeIds") as string;

  const attendeeIds = attendeeIdsRaw
    ? attendeeIdsRaw.split(",").filter(Boolean)
    : [];

  const [meeting] = await db
    .insert(meetings)
    .values({
      spaceId: space.id,
      title,
      date: new Date(dateStr),
      type,
      notes,
      createdBy: user.id,
    })
    .returning({ id: meetings.id });

  // Add attendees
  if (attendeeIds.length > 0) {
    await db.insert(meetingAttendees).values(
      attendeeIds.map((userId) => ({
        meetingId: meeting.id,
        userId,
      }))
    );
  }

  // Add agenda items
  const agendaTitles = formData.getAll("agendaTitle") as string[];
  const agendaDescriptions = formData.getAll("agendaDescription") as string[];
  const agendaTypes = formData.getAll("agendaType") as string[];

  const agendaValues = agendaTitles
    .map((title, i) => ({
      title: title.trim(),
      description: agendaDescriptions[i]?.trim() || null,
      type: (agendaTypes[i] || "for_discussion") as "for_decision" | "for_discussion" | "for_information",
      sortOrder: i,
    }))
    .filter((a) => a.title.length > 0);

  if (agendaValues.length > 0) {
    await db.insert(meetingAgendaItems).values(
      agendaValues.map((a) => ({
        meetingId: meeting.id,
        title: a.title,
        description: a.description,
        type: a.type,
        sortOrder: a.sortOrder,
      }))
    );
  }

  redirect("/meetings");
}

export async function updateMeeting(meetingId: string, formData: FormData) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  const [existing] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "Meeting not found" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Meeting title is required" };

  const dateStr = formData.get("date") as string;
  if (!dateStr) return { error: "Date is required" };

  const type = (formData.get("type") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const attendeeIdsRaw = formData.get("attendeeIds") as string;

  const attendeeIds = attendeeIdsRaw
    ? attendeeIdsRaw.split(",").filter(Boolean)
    : [];

  await db
    .update(meetings)
    .set({
      title,
      date: new Date(dateStr),
      type,
      notes,
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, meetingId));

  // Replace attendees
  await db.delete(meetingAttendees).where(eq(meetingAttendees.meetingId, meetingId));
  if (attendeeIds.length > 0) {
    await db.insert(meetingAttendees).values(
      attendeeIds.map((userId) => ({
        meetingId,
        userId,
      }))
    );
  }

  // Replace agenda items
  await db.delete(meetingAgendaItems).where(eq(meetingAgendaItems.meetingId, meetingId));
  const agendaTitles = formData.getAll("agendaTitle") as string[];
  const agendaDescriptions = formData.getAll("agendaDescription") as string[];
  const agendaTypes = formData.getAll("agendaType") as string[];

  const agendaValues = agendaTitles
    .map((title, i) => ({
      title: title.trim(),
      description: agendaDescriptions[i]?.trim() || null,
      type: (agendaTypes[i] || "for_discussion") as "for_decision" | "for_discussion" | "for_information",
      sortOrder: i,
    }))
    .filter((a) => a.title.length > 0);

  if (agendaValues.length > 0) {
    await db.insert(meetingAgendaItems).values(
      agendaValues.map((a) => ({
        meetingId,
        title: a.title,
        description: a.description,
        type: a.type,
        sortOrder: a.sortOrder,
      }))
    );
  }

  redirect("/meetings");
}
