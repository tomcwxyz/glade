import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Seed a space with example governance data so new users can see how
 * the app works. All records belong to the creating user.
 */
export async function seedExampleData(
  spaceId: string,
  userId: string,
  userName: string,
) {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  // --- Tags ---
  const tagRows = await db
    .insert(schema.tags)
    .values([
      { spaceId, name: "strategy", color: "canopy" },
      { spaceId, name: "finance", color: "amber" },
      { spaceId, name: "operations", color: "sky" },
      { spaceId, name: "community", color: "moss" },
      { spaceId, name: "governance", color: "earth" },
    ])
    .returning({ id: schema.tags.id, name: schema.tags.name });

  const tagId = Object.fromEntries(tagRows.map((t) => [t.name, t.id]));

  // --- Decisions ---
  const decisionData = [
    {
      number: 1,
      title: "Adopt consent-based decision-making as default method",
      description:
        "The board agreed to move from majority voting to consent-based decision-making for all operational decisions, keeping majority vote for constitutional changes.",
      rationale:
        "Consent-based methods ensure no one has a reasoned objection, leading to better-quality decisions that the whole group can support.",
      method: "consensus" as const,
      outcome: "Consent is now the default method for operational decisions.",
      status: "implemented" as const,
      participants: [userName],
      date: daysAgo(75),
      reviewDate: daysAgo(-90),
      createdBy: userId,
      tags: ["governance", "strategy"],
    },
    {
      number: 2,
      title: "Set annual community grants budget at £15,000",
      description:
        "Approved a ring-fenced budget of £15,000 for small community grants in the next financial year, funded from unrestricted reserves.",
      rationale:
        "Supporting grassroots community projects aligns with our charitable objects and builds local trust.",
      method: "majority_vote" as const,
      outcome: "£15,000 allocated from reserves for community grants.",
      status: "decided" as const,
      participants: [userName],
      date: daysAgo(30),
      reviewDate: daysAgo(-180),
      createdBy: userId,
      tags: ["finance", "community"],
    },
    {
      number: 3,
      title: "Appoint volunteer coordinator role",
      description:
        "Created a new volunteer coordinator role to manage the growing pool of community volunteers and ensure proper safeguarding.",
      rationale:
        "Volunteer numbers have doubled this year and we need a dedicated person to handle onboarding, training, and DBS checks.",
      method: "consent" as const,
      outcome:
        "Role description approved. Recruitment to begin next month.",
      status: "decided" as const,
      participants: [userName],
      date: daysAgo(14),
      createdBy: userId,
      tags: ["operations", "community"],
    },
    {
      number: 4,
      title: "Review and update safeguarding policy",
      description:
        "Completed the annual review of the safeguarding policy, incorporating new Charity Commission guidance and feedback from the volunteer team.",
      rationale:
        "Our existing policy was two years old and didn't reflect the latest statutory guidance.",
      method: "advice_process" as const,
      outcome:
        "Updated policy published. All staff and volunteers to complete refresher training within 60 days.",
      status: "reviewed" as const,
      participants: [userName],
      date: daysAgo(60),
      reviewDate: daysAgo(-305),
      createdBy: userId,
      tags: ["governance", "operations"],
    },
  ];

  const decisionRows = await db
    .insert(schema.decisions)
    .values(
      decisionData.map(({ tags: _tags, ...d }) => ({ ...d, spaceId })),
    )
    .returning({ id: schema.decisions.id, number: schema.decisions.number });

  const decisionId = Object.fromEntries(
    decisionRows.map((d) => [d.number, d.id]),
  );

  // --- Decision tags ---
  const decisionTagValues = decisionData.flatMap((d) =>
    d.tags.map((tagName) => ({
      decisionId: decisionId[d.number],
      tagId: tagId[tagName],
    })),
  );
  await db.insert(schema.decisionTags).values(decisionTagValues);

  // --- Meetings ---
  const meetingData = [
    {
      title: "Board Meeting — Q4 Review",
      date: daysAgo(14),
      type: "Board Meeting",
      notes: "Quarterly review of finances, community programmes, and governance updates.",
      createdBy: userId,
      agendaItems: [
        { title: "Q4 financial report", type: "for_information" as const },
        { title: "Volunteer coordinator appointment", type: "for_decision" as const },
        { title: "Community grants progress", type: "for_discussion" as const },
      ],
      decisionNumbers: [2, 3],
    },
    {
      title: "Governance Committee",
      date: daysAgo(60),
      type: "Committee Meeting",
      notes: "Reviewed safeguarding policy and consent-based decision-making trial.",
      createdBy: userId,
      agendaItems: [
        { title: "Safeguarding policy review", type: "for_decision" as const },
        { title: "Consent method evaluation", type: "for_discussion" as const },
      ],
      decisionNumbers: [4],
    },
  ];

  for (const m of meetingData) {
    const { agendaItems, decisionNumbers, ...meetingValues } = m;

    const [meeting] = await db
      .insert(schema.meetings)
      .values({ ...meetingValues, spaceId })
      .returning({ id: schema.meetings.id });

    // Attendee
    await db
      .insert(schema.meetingAttendees)
      .values({ meetingId: meeting.id, userId });

    // Agenda items
    if (agendaItems.length > 0) {
      await db.insert(schema.meetingAgendaItems).values(
        agendaItems.map((ai, i) => ({
          meetingId: meeting.id,
          title: ai.title,
          type: ai.type,
          sortOrder: i,
        })),
      );
    }

    // Meeting-decision links
    if (decisionNumbers.length > 0) {
      await db.insert(schema.meetingDecisions).values(
        decisionNumbers.map((num) => ({
          meetingId: meeting.id,
          decisionId: decisionId[num],
        })),
      );
    }
  }

  // --- Actions ---
  const actionData = [
    {
      decisionNumber: 1,
      description: "Update decision-making guidance document with consent process",
      status: "complete" as const,
      dueDate: daysAgo(45),
      completedAt: daysAgo(50),
    },
    {
      decisionNumber: 2,
      description: "Draft community grants application form and criteria",
      status: "in_progress" as const,
      dueDate: daysAgo(-14),
    },
    {
      decisionNumber: 3,
      description: "Write volunteer coordinator job description and post on website",
      status: "open" as const,
      dueDate: daysAgo(-21),
    },
    {
      decisionNumber: 4,
      description: "Schedule safeguarding refresher training for all staff and volunteers",
      status: "open" as const,
      dueDate: daysAgo(-30),
    },
  ];

  await db.insert(schema.actions).values(
    actionData.map(({ decisionNumber, ...a }) => ({
      ...a,
      spaceId,
      decisionId: decisionId[decisionNumber],
      ownerId: userId,
      ownerName: userName,
    })),
  );

  // --- Decision links (roots in the Glade) ---
  await db.insert(schema.decisionLinks).values([
    {
      fromDecisionId: decisionId[4],
      toDecisionId: decisionId[1],
      linkType: "relates_to",
    },
    {
      fromDecisionId: decisionId[3],
      toDecisionId: decisionId[2],
      linkType: "relates_to",
    },
  ]);

  // --- Document ---
  const docContent = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Safeguarding Policy" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This policy sets out our commitment to safeguarding children, young people, and adults at risk who engage with our programmes and services.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Scope" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This policy applies to all trustees, staff, volunteers, and contractors working on behalf of the organisation.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Key principles" }],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "The welfare of children and vulnerable adults is paramount." },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "All concerns and allegations will be taken seriously and responded to swiftly." },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Safer recruitment practices will be followed for all roles involving contact with vulnerable groups." },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const [doc] = await db
    .insert(schema.documents)
    .values({
      spaceId,
      title: "Safeguarding Policy",
      type: "policy",
      content: docContent,
      status: "published",
      currentVersion: 1,
      createdBy: userId,
    })
    .returning({ id: schema.documents.id });

  await db.insert(schema.documentVersions).values({
    documentId: doc.id,
    versionNumber: 1,
    content: docContent,
    changeDescription: "Initial version",
    decisionId: decisionId[4],
    createdBy: userId,
  });
}
