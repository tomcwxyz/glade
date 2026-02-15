/**
 * Seed script: populates the database with Riverside Trust demo data.
 *
 * Usage: npx tsx src/db/seed.ts
 *
 * Creates a demo user (demo@glade.app / password123), a space,
 * and the full Riverside Trust governance scenario.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("Seeding database...\n");

  // --- Users ---
  const passwordHash = await bcrypt.hash("password123", 12);

  const memberNames = [
    "Amara Osei",
    "Ben Griffiths",
    "Clara Ivanova",
    "David Chen",
    "Eleanor Wright",
    "Femi Adeyemi",
    "Grace Patel",
    "Hassan Mahmoud",
  ];

  const userRows = await db
    .insert(schema.users)
    .values(
      memberNames.map((name) => ({
        name,
        email: `${name.toLowerCase().replace(/ /g, ".")}@riverside-trust.org`,
        passwordHash,
      }))
    )
    .returning({ id: schema.users.id, name: schema.users.name, email: schema.users.email });

  console.log(`Created ${userRows.length} users`);

  // Create a demo login user
  const [demoUser] = await db
    .insert(schema.users)
    .values({
      name: "Demo User",
      email: "demo@glade.app",
      passwordHash,
    })
    .returning({ id: schema.users.id });

  console.log("Created demo user (demo@glade.app / password123)");

  // Build a lookup by name
  const userByName: Record<string, string> = {};
  for (const u of userRows) {
    userByName[u.name!] = u.id;
  }

  // --- Space ---
  const [space] = await db
    .insert(schema.spaces)
    .values({
      name: "Riverside Community Trust",
      slug: "riverside-trust",
      description:
        "A community trust supporting vulnerable people in the Riverside area through frontline services, partnerships, and advocacy.",
    })
    .returning({ id: schema.spaces.id });

  console.log("Created space: Riverside Community Trust");

  // Add all users + demo as members
  await db.insert(schema.spaceMembers).values([
    ...userRows.map((u) => ({
      spaceId: space.id,
      userId: u.id,
      role: "member" as const,
    })),
    { spaceId: space.id, userId: demoUser.id, role: "admin" as const },
  ]);

  // Make Amara the admin
  // (she's already a member; update her role)
  const { eq, and } = await import("drizzle-orm");
  await db
    .update(schema.spaceMembers)
    .set({ role: "admin" })
    .where(
      and(
        eq(schema.spaceMembers.spaceId, space.id),
        eq(schema.spaceMembers.userId, userByName["Amara Osei"])
      )
    );

  console.log("Added 9 members to space");

  // --- Tags ---
  const tagNames = [
    "service delivery",
    "strategy",
    "partnerships",
    "finance",
    "HR",
    "governance",
    "compliance",
    "operations",
    "communications",
  ];

  const tagRows = await db
    .insert(schema.tags)
    .values(tagNames.map((name) => ({ spaceId: space.id, name })))
    .returning({ id: schema.tags.id, name: schema.tags.name });

  const tagByName: Record<string, string> = {};
  for (const t of tagRows) {
    tagByName[t.name] = t.id;
  }

  console.log(`Created ${tagRows.length} tags`);

  // --- Meetings ---
  const meetingData = [
    {
      title: "Board Meeting — February 2026",
      date: new Date("2026-02-10"),
      type: "Board",
      attendees: ["Amara Osei", "Ben Griffiths", "Clara Ivanova", "David Chen", "Eleanor Wright", "Femi Adeyemi", "Grace Patel"],
    },
    {
      title: "Finance Committee — January 2026",
      date: new Date("2026-01-28"),
      type: "Committee",
      attendees: ["Amara Osei", "Ben Griffiths", "Clara Ivanova", "David Chen", "Eleanor Wright", "Femi Adeyemi"],
    },
    {
      title: "Board Meeting — January 2026",
      date: new Date("2026-01-08"),
      type: "Board",
      attendees: ["Amara Osei", "Ben Griffiths", "Clara Ivanova", "Femi Adeyemi", "Grace Patel"],
    },
    {
      title: "Board Meeting — December 2025",
      date: new Date("2025-12-12"),
      type: "Board",
      attendees: ["Amara Osei", "Ben Griffiths", "Clara Ivanova", "David Chen", "Eleanor Wright", "Femi Adeyemi", "Grace Patel", "Hassan Mahmoud"],
    },
  ];

  const meetingRows = await db
    .insert(schema.meetings)
    .values(
      meetingData.map((m) => ({
        spaceId: space.id,
        title: m.title,
        date: m.date,
        type: m.type,
      }))
    )
    .returning({ id: schema.meetings.id, title: schema.meetings.title });

  // Add attendees
  for (let i = 0; i < meetingData.length; i++) {
    const attendeeValues = meetingData[i].attendees
      .filter((name) => userByName[name])
      .map((name) => ({
        meetingId: meetingRows[i].id,
        userId: userByName[name],
      }));
    if (attendeeValues.length > 0) {
      await db.insert(schema.meetingAttendees).values(attendeeValues);
    }
  }

  console.log(`Created ${meetingRows.length} meetings with attendees`);

  // --- Decisions ---
  const decisionData = [
    {
      number: 47,
      title: "Adopt trauma-informed approach across all service delivery",
      description: "All frontline services to integrate trauma-informed principles into their practice frameworks. Staff training programme to be developed in partnership with the clinical team.",
      rationale: "Evidence from our pilot programme showed 40% improvement in service user engagement. National guidance now recommends this approach. Three service users on our advisory panel specifically requested this change.",
      method: "consent" as const,
      outcome: "Adopted with amendment: implementation timeline extended to 18 months to allow for comprehensive training.",
      status: "implemented" as const,
      participants: ["Amara Osei", "Ben Griffiths", "Clara Ivanova", "David Chen", "Eleanor Wright"],
      date: new Date("2026-02-10"),
      tags: ["service delivery", "strategy"],
      reviewDate: new Date("2026-08-10"),
      meetingTitle: "Board Meeting — February 2026",
    },
    {
      number: 46,
      title: "Partner with City Housing Trust on joint referral pathway",
      description: "Establish a formal referral pathway with City Housing Trust for service users experiencing housing instability. Includes data sharing agreement and quarterly review meetings.",
      rationale: "32% of our service users reported housing as their primary concern in the annual survey. CHT approached us in November. Joint working reduces duplication and improves outcomes.",
      method: "advice_process" as const,
      outcome: "Approved. CEO to finalise MOU by end of March. Data sharing agreement to be reviewed by trustees before signing.",
      status: "decided" as const,
      participants: ["Amara Osei", "Femi Adeyemi", "Grace Patel"],
      date: new Date("2026-02-10"),
      tags: ["partnerships", "service delivery"],
      meetingTitle: "Board Meeting — February 2026",
    },
    {
      number: 45,
      title: "Approve Q3 financial forecast and revised budget",
      description: "Review and approve the Q3 financial forecast showing projected underspend of £42k against the annual budget, with proposed reallocation to the digital transformation fund.",
      rationale: "Underspend primarily from delayed recruitment (2 posts filled 3 months late). Reallocation to digital fund supports strategic priority agreed in September.",
      method: "majority_vote" as const,
      outcome: "Approved unanimously. Finance committee to monitor monthly and report any variance over 5%.",
      status: "reviewed" as const,
      participants: ["Amara Osei", "Ben Griffiths", "Clara Ivanova", "David Chen", "Eleanor Wright", "Femi Adeyemi"],
      date: new Date("2026-01-28"),
      tags: ["finance"],
      meetingTitle: "Finance Committee — January 2026",
    },
    {
      number: 44,
      title: "Clinical supervision policy update",
      description: "Update clinical supervision policy to require monthly rather than quarterly supervision for all practitioners working with high-risk service users.",
      rationale: "Safeguarding review recommended increased supervision frequency. Aligns with updated sector standards from the Professional Standards Authority.",
      method: "consent" as const,
      outcome: "Adopted. HR to update contracts and supervision schedules by end of February.",
      status: "implemented" as const,
      participants: ["Clara Ivanova", "Eleanor Wright", "Grace Patel", "Hassan Mahmoud"],
      date: new Date("2026-01-15"),
      tags: ["HR", "governance"],
    },
    {
      number: 43,
      title: "Delegate social media strategy to Communications Working Group",
      description: "Grant the Communications Working Group authority to develop and implement social media strategy, with quarterly reporting to the board.",
      rationale: "Board meetings are not the right forum for tactical social media decisions. Working group has the expertise and capacity. Clear reporting requirements maintain accountability.",
      method: "delegation" as const,
      outcome: "Delegated with constraints: budget ceiling of £2k/quarter, no political commentary, quarterly report to board.",
      status: "learned" as const,
      participants: ["Amara Osei", "Ben Griffiths", "Femi Adeyemi"],
      date: new Date("2026-01-08"),
      tags: ["governance", "communications"],
      reviewDate: new Date("2026-07-08"),
      meetingTitle: "Board Meeting — January 2026",
    },
    {
      number: 42,
      title: "Extend lease on community centre for 3 years",
      description: "Negotiate and sign a 3-year lease extension for the Riverside Community Centre, our primary service delivery location.",
      rationale: "Current lease expires in April. Relocation would cost approximately £85k and disrupt services for 2-3 months. Landlord offering favourable terms with only 3% annual increase.",
      method: "consensus" as const,
      outcome: "Agreed. CEO authorised to negotiate final terms within agreed parameters (max 4% annual increase, break clause at 18 months).",
      status: "implemented" as const,
      participants: ["Amara Osei", "Ben Griffiths", "Clara Ivanova", "David Chen", "Eleanor Wright", "Femi Adeyemi", "Grace Patel"],
      date: new Date("2025-12-12"),
      tags: ["finance", "operations"],
      meetingTitle: "Board Meeting — December 2025",
    },
    {
      number: 41,
      title: "Adopt new safeguarding policy framework",
      description: "Replace existing safeguarding policy with updated framework aligned to the 2025 statutory guidance.",
      rationale: "Statutory guidance updated in September 2025. Our current policy references superseded legislation. Insurance provider flagged as a condition of renewal.",
      method: "consent" as const,
      outcome: "Adopted. All staff to complete updated training by end of January. Policy review scheduled for December 2026.",
      status: "reviewed" as const,
      participants: ["Amara Osei", "Clara Ivanova", "Eleanor Wright", "Grace Patel", "Hassan Mahmoud"],
      date: new Date("2025-12-12"),
      tags: ["governance", "compliance"],
      reviewDate: new Date("2026-06-12"),
      meetingTitle: "Board Meeting — December 2025",
    },
  ];

  const decisionRows = await db
    .insert(schema.decisions)
    .values(
      decisionData.map((d) => ({
        number: d.number,
        spaceId: space.id,
        title: d.title,
        description: d.description,
        rationale: d.rationale,
        method: d.method,
        outcome: d.outcome,
        status: d.status,
        participants: d.participants,
        date: d.date,
        reviewDate: d.reviewDate,
      }))
    )
    .returning({ id: schema.decisions.id, number: schema.decisions.number });

  const decisionByNumber: Record<number, string> = {};
  for (const d of decisionRows) {
    decisionByNumber[d.number] = d.id;
  }

  console.log(`Created ${decisionRows.length} decisions`);

  // --- Decision tags ---
  const tagInserts: { decisionId: string; tagId: string }[] = [];
  for (const d of decisionData) {
    for (const tagName of d.tags) {
      if (tagByName[tagName] && decisionByNumber[d.number]) {
        tagInserts.push({
          decisionId: decisionByNumber[d.number],
          tagId: tagByName[tagName],
        });
      }
    }
  }
  if (tagInserts.length > 0) {
    await db.insert(schema.decisionTags).values(tagInserts);
  }

  console.log(`Created ${tagInserts.length} decision-tag links`);

  // --- Meeting-decision links ---
  const meetingByTitle: Record<string, string> = {};
  for (const m of meetingRows) {
    meetingByTitle[m.title] = m.id;
  }

  const mdInserts: { meetingId: string; decisionId: string }[] = [];
  for (const d of decisionData) {
    if (d.meetingTitle && meetingByTitle[d.meetingTitle] && decisionByNumber[d.number]) {
      mdInserts.push({
        meetingId: meetingByTitle[d.meetingTitle],
        decisionId: decisionByNumber[d.number],
      });
    }
  }
  if (mdInserts.length > 0) {
    await db.insert(schema.meetingDecisions).values(mdInserts);
  }

  console.log(`Created ${mdInserts.length} meeting-decision links`);

  // --- Decision links ---
  // #47 relates_to #44 (and vice versa)
  await db.insert(schema.decisionLinks).values([
    {
      fromDecisionId: decisionByNumber[47],
      toDecisionId: decisionByNumber[44],
      linkType: "relates_to",
    },
  ]);

  console.log("Created 1 decision link (#47 relates_to #44)");

  // --- Actions ---
  const actionData = [
    {
      description: "Develop trauma-informed training curriculum with clinical team",
      ownerName: "Clara Ivanova",
      dueDate: new Date("2026-03-15"),
      status: "in_progress" as const,
      decisionNumber: 47,
    },
    {
      description: "Finalise MOU with City Housing Trust",
      ownerName: "Amara Osei",
      dueDate: new Date("2026-03-31"),
      status: "open" as const,
      decisionNumber: 46,
    },
    {
      description: "Draft data sharing agreement for trustee review",
      ownerName: "Femi Adeyemi",
      dueDate: new Date("2026-03-15"),
      status: "open" as const,
      decisionNumber: 46,
    },
    {
      description: "Set up quarterly review meetings with CHT",
      ownerName: "Grace Patel",
      dueDate: new Date("2026-04-01"),
      status: "open" as const,
      decisionNumber: 46,
    },
    {
      description: "Complete updated safeguarding training — remaining 3 staff",
      ownerName: "Hassan Mahmoud",
      dueDate: new Date("2026-01-31"),
      status: "overdue" as const,
      decisionNumber: 41,
    },
  ];

  await db.insert(schema.actions).values(
    actionData.map((a) => ({
      spaceId: space.id,
      decisionId: decisionByNumber[a.decisionNumber],
      description: a.description,
      ownerName: a.ownerName,
      ownerId: userByName[a.ownerName] || null,
      dueDate: a.dueDate,
      status: a.status,
    }))
  );

  console.log(`Created ${actionData.length} actions`);

  console.log("\nSeed complete!");
  console.log("Login: demo@glade.app / password123");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
