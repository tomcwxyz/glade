/**
 * Seed script: populates the database with Riverside Trust demo data.
 *
 * Usage: npx tsx src/db/seed.ts
 *        npx tsx src/db/seed.ts --force   (delete existing demo data first)
 *
 * Creates a demo user (demo@glade.app / password123), a space,
 * and the full Riverside Trust governance scenario.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

const forceFlag = process.argv.includes("--force");

async function seed() {
  // --- Idempotency guard ---
  const [existingDemo] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, "demo@glade.app"))
    .limit(1);

  if (existingDemo) {
    if (!forceFlag) {
      console.log("Demo data already exists (demo@glade.app found).");
      console.log("Run with --force to delete and re-seed.");
      process.exit(0);
    }

    console.log("--force: deleting existing demo data...");
    // Find the space owned by the demo scenario
    const [existingSpace] = await db
      .select({ id: schema.spaces.id })
      .from(schema.spaces)
      .where(eq(schema.spaces.slug, "riverside-trust"))
      .limit(1);

    if (existingSpace) {
      // Cascade delete handles all space children
      await db.delete(schema.spaces).where(eq(schema.spaces.id, existingSpace.id));
    }

    // Delete all seed users (by known emails)
    const memberEmails = [
      "amara.osei@riverside-trust.org",
      "ben.griffiths@riverside-trust.org",
      "clara.ivanova@riverside-trust.org",
      "david.chen@riverside-trust.org",
      "eleanor.wright@riverside-trust.org",
      "femi.adeyemi@riverside-trust.org",
      "grace.patel@riverside-trust.org",
      "hassan.mahmoud@riverside-trust.org",
      "demo@glade.app",
    ];
    for (const email of memberEmails) {
      await db.delete(schema.users).where(eq(schema.users.email, email));
    }

    console.log("Existing demo data deleted.\n");
  }

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
  const { and } = await import("drizzle-orm");
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
      notes: "Quorum confirmed with 7 of 8 trustees present. Chair opened with a reflection on the trust's 10th anniversary this year. Key discussion on the trauma-informed approach ran longer than scheduled — strong support but practical concerns about training timelines. Partnership with City Housing Trust approved subject to data sharing agreement review.",
      attendees: ["Amara Osei", "Ben Griffiths", "Clara Ivanova", "David Chen", "Eleanor Wright", "Femi Adeyemi", "Grace Patel"],
    },
    {
      title: "Finance Committee — January 2026",
      date: new Date("2026-01-28"),
      type: "Committee",
      notes: "Committee reviewed the Q3 forecast in detail. Underspend of £42k primarily attributable to delayed recruitment. Agreed to reallocate to digital transformation fund as per strategic plan. Insurance renewal flagged — safeguarding policy update needed before March renewal date.",
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
        notes: m.notes || null,
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

  console.log(`Created ${meetingRows.length} meetings with attendees and notes`);

  // Build meeting lookup
  const meetingByTitle: Record<string, string> = {};
  for (const m of meetingRows) {
    meetingByTitle[m.title] = m.id;
  }

  // --- Meeting agenda items ---
  const agendaItemData = [
    // February 2026 Board Meeting
    { meetingTitle: "Board Meeting — February 2026", title: "Trauma-informed approach proposal", description: "Review proposal to adopt trauma-informed principles across all frontline services. Clinical team to present evidence from the pilot programme.", type: "for_decision" as const, sortOrder: 1 },
    { meetingTitle: "Board Meeting — February 2026", title: "City Housing Trust partnership", description: "Consider formal referral pathway partnership with City Housing Trust. CEO to present draft MOU terms.", type: "for_decision" as const, sortOrder: 2 },
    { meetingTitle: "Board Meeting — February 2026", title: "10th anniversary planning update", description: "Communications team to share plans for anniversary celebrations in July. Budget and timeline overview.", type: "for_information" as const, sortOrder: 3 },
    // Finance Committee — January 2026
    { meetingTitle: "Finance Committee — January 2026", title: "Q3 financial forecast review", description: "Detailed review of Q3 actuals vs budget. Discussion on the £42k underspend and proposed reallocation.", type: "for_decision" as const, sortOrder: 1 },
    { meetingTitle: "Finance Committee — January 2026", title: "Insurance renewal and safeguarding", description: "Insurance provider has flagged safeguarding policy update as a condition of renewal. Timeline discussion.", type: "for_discussion" as const, sortOrder: 2 },
    { meetingTitle: "Finance Committee — January 2026", title: "Digital transformation fund progress", description: "Update on spend to date against the digital transformation budget line.", type: "for_information" as const, sortOrder: 3 },
    // January 2026 Board Meeting
    { meetingTitle: "Board Meeting — January 2026", title: "Social media strategy delegation", description: "Proposal to delegate social media strategy to Communications Working Group with quarterly reporting.", type: "for_decision" as const, sortOrder: 1 },
    { meetingTitle: "Board Meeting — January 2026", title: "Clinical supervision policy update", description: "Review updated supervision requirements for high-risk practitioners following safeguarding review.", type: "for_decision" as const, sortOrder: 2 },
    { meetingTitle: "Board Meeting — January 2026", title: "Staff wellbeing survey results", description: "HR to present findings from the December staff wellbeing survey. Discussion on emerging themes.", type: "for_discussion" as const, sortOrder: 3 },
    // December 2025 Board Meeting
    { meetingTitle: "Board Meeting — December 2025", title: "Safeguarding policy framework", description: "Adoption of new safeguarding policy aligned to 2025 statutory guidance. Insurance renewal depends on this.", type: "for_decision" as const, sortOrder: 1 },
    { meetingTitle: "Board Meeting — December 2025", title: "Community centre lease extension", description: "Negotiate and approve 3-year lease extension. Current lease expires April 2026.", type: "for_decision" as const, sortOrder: 2 },
    { meetingTitle: "Board Meeting — December 2025", title: "Annual impact report draft", description: "First draft of the 2025 impact report for trustee review. Final version due February.", type: "for_information" as const, sortOrder: 3 },
  ];

  await db.insert(schema.meetingAgendaItems).values(
    agendaItemData.map((a) => ({
      meetingId: meetingByTitle[a.meetingTitle],
      title: a.title,
      description: a.description,
      type: a.type,
      sortOrder: a.sortOrder,
    }))
  );

  console.log(`Created ${agendaItemData.length} meeting agenda items`);

  // --- Decisions ---
  const decisionData = [
    {
      number: 47,
      title: "Adopt trauma-informed approach across all service delivery",
      description: "All frontline services to integrate trauma-informed principles into their practice frameworks. Staff training programme to be developed in partnership with the clinical team.",
      rationale: "Evidence from our pilot programme showed 40% improvement in service user engagement. National guidance now recommends this approach. Three service users on our advisory panel specifically requested this change.",
      method: "consent" as const,
      outcome: "Adopted with amendment: implementation timeline extended to 18 months to allow for comprehensive training.",
      conditions: "Subject to annual review of training completion rates. Must achieve 80% staff certification within 12 months. Clinical team to provide quarterly progress reports.",
      status: "implemented" as const,
      participants: ["Amara Osei", "Ben Griffiths", "Clara Ivanova", "David Chen", "Eleanor Wright"],
      date: new Date("2026-02-10"),
      tags: ["service delivery", "strategy"],
      reviewDate: new Date("2026-08-10"),
      meetingTitle: "Board Meeting — February 2026",
      createdByName: "Amara Osei",
    },
    {
      number: 46,
      title: "Partner with City Housing Trust on joint referral pathway",
      description: "Establish a formal referral pathway with City Housing Trust for service users experiencing housing instability. Includes data sharing agreement and quarterly review meetings.",
      rationale: "32% of our service users reported housing as their primary concern in the annual survey. CHT approached us in November. Joint working reduces duplication and improves outcomes.",
      method: "advice_process" as const,
      outcome: "Approved. CEO to finalise MOU by end of March. Data sharing agreement to be reviewed by trustees before signing.",
      conditions: "Data sharing agreement must be approved by trustees before any personal data is exchanged. MOU to include 6-month break clause.",
      status: "decided" as const,
      participants: ["Amara Osei", "Femi Adeyemi", "Grace Patel"],
      date: new Date("2026-02-10"),
      tags: ["partnerships", "service delivery"],
      meetingTitle: "Board Meeting — February 2026",
      createdByName: "Femi Adeyemi",
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
      createdByName: "Ben Griffiths",
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
      createdByName: "Clara Ivanova",
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
      createdByName: "Amara Osei",
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
      createdByName: "Ben Griffiths",
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
      createdByName: "Eleanor Wright",
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
        conditions: d.conditions || null,
        status: d.status,
        participants: d.participants,
        date: d.date,
        reviewDate: d.reviewDate,
        createdBy: d.createdByName ? userByName[d.createdByName] : null,
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
  await db.insert(schema.decisionLinks).values([
    {
      fromDecisionId: decisionByNumber[47],
      toDecisionId: decisionByNumber[44],
      linkType: "relates_to",
    },
    {
      fromDecisionId: decisionByNumber[46],
      toDecisionId: decisionByNumber[43],
      linkType: "supersedes",
    },
    {
      fromDecisionId: decisionByNumber[41],
      toDecisionId: decisionByNumber[44],
      linkType: "supersedes",
    },
    {
      fromDecisionId: decisionByNumber[45],
      toDecisionId: decisionByNumber[42],
      linkType: "amends",
    },
    {
      fromDecisionId: decisionByNumber[43],
      toDecisionId: decisionByNumber[41],
      linkType: "relates_to",
    },
  ]);

  console.log("Created 5 decision links (supersedes, relates_to, amends)");

  // --- Actions (including completed) ---
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
    // Completed actions
    {
      description: "Update clinical supervision contracts and schedules",
      ownerName: "Eleanor Wright",
      dueDate: new Date("2026-02-28"),
      status: "complete" as const,
      completedAt: new Date("2026-02-14"),
      decisionNumber: 44,
    },
    {
      description: "Negotiate lease extension terms with landlord",
      ownerName: "Amara Osei",
      dueDate: new Date("2026-01-15"),
      status: "complete" as const,
      completedAt: new Date("2026-01-10"),
      decisionNumber: 42,
    },
    {
      description: "Distribute updated safeguarding policy to all staff",
      ownerName: "Grace Patel",
      dueDate: new Date("2026-01-05"),
      status: "complete" as const,
      completedAt: new Date("2025-12-20"),
      decisionNumber: 41,
    },
    {
      description: "Book trauma-informed practice training venue",
      ownerName: "David Chen",
      dueDate: new Date("2026-03-01"),
      status: "in_progress" as const,
      decisionNumber: 47,
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
      completedAt: ("completedAt" in a ? a.completedAt : null) as Date | null,
    }))
  );

  console.log(`Created ${actionData.length} actions (including ${actionData.filter((a) => a.status === "complete").length} completed)`);

  // --- Documents with versions ---
  const constitutionContentV1 = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "1. Name and Purpose" }] },
      { type: "paragraph", content: [{ type: "text", text: "The organisation shall be known as Riverside Community Trust (the \"Trust\"). The Trust is established to support vulnerable people in the Riverside area through frontline services, partnerships, and advocacy." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "2. Objects" }] },
      { type: "paragraph", content: [{ type: "text", text: "The Trust exists to:" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Provide direct support services to people experiencing vulnerability, poverty, or social exclusion" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Develop and maintain partnerships with statutory and voluntary sector organisations" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Advocate for systemic change that benefits the communities we serve" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Promote best practice in governance and service delivery" }] }] },
      ] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "3. Governance" }] },
      { type: "paragraph", content: [{ type: "text", text: "The Trust shall be governed by a Board of Trustees comprising no fewer than 5 and no more than 12 members. Trustees serve a term of 3 years and may stand for re-election for up to two further terms." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "4. Decision Making" }] },
      { type: "paragraph", content: [{ type: "text", text: "The Board shall use consent-based decision making as its primary method. Decisions are recorded in the decision log with full rationale, participants, and review dates. The Board may delegate authority to committees or working groups with defined constraints." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "5. Safeguarding" }] },
      { type: "paragraph", content: [{ type: "text", text: "The Trust is committed to safeguarding all service users, staff, and volunteers. A safeguarding policy shall be maintained and reviewed annually, in line with current statutory guidance." }] },
    ],
  };

  const constitutionContentV2 = {
    type: "doc",
    content: [
      ...constitutionContentV1.content.slice(0, -1),
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "5. Safeguarding" }] },
      { type: "paragraph", content: [{ type: "text", text: "The Trust is committed to safeguarding all service users, staff, and volunteers. A safeguarding policy shall be maintained and reviewed annually, in line with current statutory guidance. The Board shall ensure that all staff and volunteers receive appropriate safeguarding training, with enhanced requirements for those working with high-risk service users, as defined in the Safeguarding Policy." }] },
    ],
  };

  const safeguardingContent = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "1. Policy Statement" }] },
      { type: "paragraph", content: [{ type: "text", text: "Riverside Community Trust is committed to protecting the welfare of all people who come into contact with our services. This policy sets out our approach to safeguarding in line with the Safeguarding Vulnerable Groups Act 2006 (as amended) and the 2025 statutory guidance." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "2. Scope" }] },
      { type: "paragraph", content: [{ type: "text", text: "This policy applies to all trustees, employees, volunteers, contractors, and anyone working on behalf of the Trust. It covers:" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Children and young people under 18" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Adults at risk of abuse or neglect" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Staff and volunteer welfare" }] }] },
      ] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "3. Designated Safeguarding Lead" }] },
      { type: "paragraph", content: [{ type: "text", text: "The designated safeguarding lead (DSL) is responsible for managing safeguarding concerns. The DSL reports directly to the Board and maintains the safeguarding log. All staff must know how to contact the DSL." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "4. Reporting Procedures" }] },
      { type: "paragraph", content: [{ type: "text", text: "Any safeguarding concern must be reported to the DSL within 24 hours. Urgent concerns involving immediate risk should be reported to the police or local authority without delay. The DSL will record all concerns and actions taken." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "5. Training Requirements" }] },
      { type: "paragraph", content: [{ type: "text", text: "All staff and volunteers must complete Level 1 safeguarding training within their first month. Practitioners working with high-risk service users must complete enhanced safeguarding training and receive monthly clinical supervision. Training records are maintained by HR." }] },
    ],
  };

  const roleDescContent = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Role: Trustee / Board Member" }] },
      { type: "paragraph", content: [{ type: "text", text: "Riverside Community Trust is seeking committed individuals to join our Board of Trustees. This is a voluntary role with significant impact on the direction and effectiveness of the Trust's work." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Key Responsibilities" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Set the strategic direction of the Trust and monitor progress against objectives" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Ensure financial sustainability and proper stewardship of resources" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Provide oversight and accountability for safeguarding, legal compliance, and risk management" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Attend board meetings (approximately 6 per year) and contribute to committee work" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Act as an ambassador for the Trust in the community" }] }] },
      ] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Person Specification" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Commitment to the Trust's mission and values" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Experience in governance, finance, service delivery, or community development" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Ability to think strategically and work collaboratively" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Lived experience of the issues facing the Riverside community (desirable)" }] }] },
      ] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Time Commitment" }] },
      { type: "paragraph", content: [{ type: "text", text: "Approximately 4–6 hours per month, including board meetings, committee work, and preparation time. Board meetings are held bi-monthly, with additional committee meetings as needed." }] },
    ],
  };

  // Create documents
  const [constitutionDoc] = await db
    .insert(schema.documents)
    .values({
      spaceId: space.id,
      title: "Riverside Community Trust Constitution",
      type: "constitution",
      content: constitutionContentV2,
      status: "published",
      currentVersion: 2,
      createdBy: userByName["Amara Osei"],
    })
    .returning({ id: schema.documents.id });

  const [safeguardingDoc] = await db
    .insert(schema.documents)
    .values({
      spaceId: space.id,
      title: "Safeguarding Policy",
      type: "policy",
      content: safeguardingContent,
      status: "published",
      currentVersion: 1,
      createdBy: userByName["Eleanor Wright"],
    })
    .returning({ id: schema.documents.id });

  const [roleDescDoc] = await db
    .insert(schema.documents)
    .values({
      spaceId: space.id,
      title: "Board Member Role Description",
      type: "role_description",
      content: roleDescContent,
      status: "draft",
      currentVersion: 1,
      createdBy: userByName["Amara Osei"],
    })
    .returning({ id: schema.documents.id });

  console.log("Created 3 documents (constitution, safeguarding policy, role description)");

  // Create document versions
  await db.insert(schema.documentVersions).values([
    // Constitution v1 — initial
    {
      documentId: constitutionDoc.id,
      versionNumber: 1,
      content: constitutionContentV1,
      changeDescription: "Initial constitution adopted at founding meeting",
      createdBy: userByName["Amara Osei"],
      createdAt: new Date("2025-06-01"),
    },
    // Constitution v2 — updated following safeguarding decision
    {
      documentId: constitutionDoc.id,
      versionNumber: 2,
      content: constitutionContentV2,
      changeDescription: "Updated section 5 (Safeguarding) to reference enhanced training requirements following decision #41",
      decisionId: decisionByNumber[41],
      createdBy: userByName["Eleanor Wright"],
      createdAt: new Date("2025-12-15"),
    },
    // Safeguarding policy v1
    {
      documentId: safeguardingDoc.id,
      versionNumber: 1,
      content: safeguardingContent,
      changeDescription: "New safeguarding policy aligned to 2025 statutory guidance",
      decisionId: decisionByNumber[41],
      createdBy: userByName["Eleanor Wright"],
      createdAt: new Date("2025-12-14"),
    },
    // Role description v1
    {
      documentId: roleDescDoc.id,
      versionNumber: 1,
      content: roleDescContent,
      changeDescription: "Draft role description for trustee recruitment",
      createdBy: userByName["Amara Osei"],
      createdAt: new Date("2026-02-01"),
    },
  ]);

  console.log("Created 4 document versions");

  // Document section links
  await db.insert(schema.documentSectionLinks).values([
    {
      documentId: constitutionDoc.id,
      sectionId: "5-safeguarding",
      decisionId: decisionByNumber[41],
    },
    {
      documentId: constitutionDoc.id,
      sectionId: "4-decision-making",
      decisionId: decisionByNumber[43],
    },
  ]);

  console.log("Created 2 document section links");

  // --- Proposals with comments and references ---
  const [mentoringProposal] = await db
    .insert(schema.proposals)
    .values({
      spaceId: space.id,
      title: "Establish peer mentoring programme",
      description: "Create a structured peer mentoring programme pairing experienced staff with newer team members. The programme would run for 6 months per cohort, with monthly check-ins and a learning review at the end.",
      rationale: "Exit interviews consistently cite lack of support as a factor in early leavers. Staff survey showed 72% would value a mentoring scheme. Other trusts in our network report improved retention rates after implementing similar programmes.",
      suggestedMethod: "advice_process",
      status: "open_for_discussion",
      createdBy: userByName["Grace Patel"],
      createdAt: new Date("2026-02-05"),
    })
    .returning({ id: schema.proposals.id });

  const [reportingProposal] = await db
    .insert(schema.proposals)
    .values({
      spaceId: space.id,
      title: "Switch to quarterly board reporting",
      description: "Replace the current monthly CEO report to the board with a quarterly comprehensive report. Monthly updates would move to a written briefing circulated by email, with board time reserved for strategic discussion.",
      rationale: "Board meetings are dominated by operational reporting, leaving insufficient time for strategic governance. Quarterly reports allow for trend analysis and deeper engagement with the data.",
      suggestedMethod: "consent",
      status: "ready_for_decision",
      createdBy: userByName["Ben Griffiths"],
      createdAt: new Date("2026-01-20"),
    })
    .returning({ id: schema.proposals.id });

  const [hybridProposal] = await db
    .insert(schema.proposals)
    .values({
      spaceId: space.id,
      title: "Adopt hybrid meeting policy",
      description: "Allow trustees to attend board meetings remotely via video call, with at least 50% of trustees physically present for quorum. Remote attendees can participate fully in discussion and decision making.",
      rationale: "Two trustees have caring responsibilities that occasionally prevent physical attendance. Hybrid options improve inclusion and reduce the risk of inquorate meetings.",
      suggestedMethod: "consent",
      status: "decided",
      decidedAsDecisionId: decisionByNumber[43],
      createdBy: userByName["Femi Adeyemi"],
      createdAt: new Date("2025-12-20"),
    })
    .returning({ id: schema.proposals.id });

  const [accessibilityProposal] = await db
    .insert(schema.proposals)
    .values({
      spaceId: space.id,
      title: "Digital accessibility audit",
      description: "Commission an external audit of all our digital services (website, referral forms, service user portal) against WCAG 2.2 AA standards. Include recommendations and a remediation plan.",
      rationale: "We have not conducted a formal accessibility audit. Several service users have reported difficulties using our online referral form. Legal requirements around digital accessibility are tightening.",
      status: "draft",
      createdBy: userByName["David Chen"],
      createdAt: new Date("2026-02-12"),
    })
    .returning({ id: schema.proposals.id });

  console.log("Created 4 proposals");

  // Proposal comments
  const [mentoringComment1] = await db
    .insert(schema.proposalComments)
    .values({
      proposalId: mentoringProposal.id,
      authorId: userByName["Clara Ivanova"],
      content: "I strongly support this. From a clinical perspective, peer mentoring would complement our supervision framework. Could we align the mentoring pairs with the trauma-informed training rollout so mentors can model the new approach?",
      createdAt: new Date("2026-02-06"),
    })
    .returning({ id: schema.proposalComments.id });

  await db.insert(schema.proposalComments).values([
    {
      proposalId: mentoringProposal.id,
      authorId: userByName["Amara Osei"],
      content: "Great idea to link it with the trauma-informed training, Clara. That would give the programme a clear focus for the first cohort rather than being too generic.",
      parentId: mentoringComment1.id,
      createdAt: new Date("2026-02-07"),
    },
    {
      proposalId: mentoringProposal.id,
      authorId: userByName["Hassan Mahmoud"],
      content: "What's the time commitment for mentors? I want to make sure we're not overloading our most experienced staff who are already stretched with training delivery.",
      createdAt: new Date("2026-02-08"),
    },
    // Reporting proposal comments
    {
      proposalId: reportingProposal.id,
      authorId: userByName["Amara Osei"],
      content: "I've been thinking about this for a while. The monthly report takes significant CEO time to prepare and board time to present, but most of it is operational detail. A quarterly deep-dive would be more useful for governance purposes.",
      createdAt: new Date("2026-01-22"),
    },
    {
      proposalId: reportingProposal.id,
      authorId: userByName["David Chen"],
      content: "Supportive in principle but we need to make sure the monthly written briefing still flags any urgent items that can't wait for the quarterly report. Perhaps include a threshold for what triggers an interim board discussion.",
      createdAt: new Date("2026-01-25"),
    },
    // Hybrid meeting proposal comments
    {
      proposalId: hybridProposal.id,
      authorId: userByName["Grace Patel"],
      content: "This would make a real difference for me. I've missed two meetings this year due to childcare issues that a remote option would have solved.",
      createdAt: new Date("2025-12-22"),
    },
    {
      proposalId: hybridProposal.id,
      authorId: userByName["Ben Griffiths"],
      content: "I'm comfortable with this as long as we invest in proper AV equipment. The experience needs to be good for both in-room and remote participants, otherwise remote trustees end up as second-class attendees.",
      createdAt: new Date("2025-12-23"),
    },
  ]);

  console.log("Created 8 proposal comments (including 1 reply thread)");

  // Proposal references
  await db.insert(schema.proposalReferences).values([
    {
      proposalId: mentoringProposal.id,
      title: "NCVO Guide to Peer Mentoring in the Voluntary Sector",
      url: "https://www.ncvo.org.uk/help-and-guidance/peer-mentoring",
    },
    {
      proposalId: reportingProposal.id,
      title: "Charity Governance Code — Principle 5: Board Effectiveness",
      url: "https://www.charitygovernancecode.org/en/5-board-effectiveness",
    },
  ]);

  console.log("Created 2 proposal references");

  // --- Topics ---
  const [mentoringTopic] = await db
    .insert(schema.topics)
    .values({
      spaceId: space.id,
      title: "Peer mentoring for new staff",
      description: "Several newer staff members have mentioned feeling unsupported in their first few months. Could a peer mentoring programme help with retention and development?",
      type: "question",
      promotedToProposalId: mentoringProposal.id,
      createdBy: userByName["Grace Patel"],
      createdAt: new Date("2026-01-28"),
    })
    .returning({ id: schema.topics.id });

  await db.insert(schema.topics).values([
    {
      spaceId: space.id,
      title: "Should we publish our decision log publicly?",
      description: "Transparency is one of our values, and several peer organisations now publish their governance decisions. Would making our decision log public build trust with funders and service users, or create risks?",
      type: "question",
      createdBy: userByName["Ben Griffiths"],
      createdAt: new Date("2026-02-10"),
    },
    {
      spaceId: space.id,
      title: "Staff burnout increasing after policy changes",
      description: "Three staff members have raised concerns about workload since the clinical supervision increase. The intention was to improve support, but the additional time commitment may be having the opposite effect for some.",
      type: "tension",
      createdBy: userByName["Clara Ivanova"],
      createdAt: new Date("2026-02-03"),
    },
    {
      spaceId: space.id,
      title: "Invite service users to next board meeting",
      description: "Our advisory panel has asked if service user representatives could attend part of a board meeting to share their perspective directly. This could be powerful but needs careful planning.",
      type: "agenda_suggestion",
      createdBy: userByName["Femi Adeyemi"],
      createdAt: new Date("2026-02-11"),
    },
  ]);

  console.log("Created 4 topics (1 promoted to proposal)");

  // --- AI Insights ---
  await db.insert(schema.insights).values([
    {
      spaceId: space.id,
      type: "pattern",
      title: "Decision method patterns",
      content: "Consent is your most-used decision method (3 of 7 decisions), followed by advice process. Your board appears comfortable with consent-based governance, which is relatively unusual in the charity sector. Consider whether majority vote might still be appropriate for high-stakes financial decisions — your Q3 budget approval used majority vote, which ensured all committee members were actively in favour.",
      status: "active",
      metadata: { decisionCount: 7, topMethod: "consent", period: "last_90_days" },
      createdAt: new Date("2026-02-15"),
    },
    {
      spaceId: space.id,
      type: "review",
      title: "Review questions for trauma-informed approach",
      content: "Questions to consider at the 6-month review:\n\n1. What percentage of staff have completed trauma-informed training?\n2. Have service user engagement metrics changed since implementation?\n3. Are there service areas where the approach has been harder to implement? Why?\n4. What feedback have service users given about changes in practice?\n5. Has the extended 18-month timeline proved realistic based on progress so far?",
      relatedDecisionId: decisionByNumber[47],
      status: "active",
      metadata: { reviewDate: "2026-08-10" },
      createdAt: new Date("2026-02-15"),
    },
    {
      spaceId: space.id,
      type: "briefing",
      title: "Governance summary — February 2026",
      content: "This month your board made 2 decisions and has 9 open actions across the organisation.\n\nKey highlights:\n- The trauma-informed approach was adopted with broad support. Training curriculum development is underway.\n- The City Housing Trust partnership was approved, with the data sharing agreement as the critical next step.\n- 3 actions are now complete, including the lease negotiation and safeguarding policy distribution.\n- 1 action is overdue: safeguarding training for the remaining 3 staff members.\n\nUpcoming reviews: Decision #43 (social media delegation) is due for review in July. Decision #47 (trauma-informed approach) has an August review date.\n\nActive proposals: 2 proposals are moving forward — peer mentoring (open for discussion) and quarterly reporting (ready for decision). The hybrid meeting proposal has been decided.",
      status: "active",
      metadata: { month: "2026-02", decisionsMade: 2, openActions: 9 },
      createdAt: new Date("2026-02-15"),
    },
  ]);

  console.log("Created 3 AI insights (pattern, review, briefing)");

  console.log("\nSeed complete!");
  console.log("Login: demo@glade.app / password123");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
