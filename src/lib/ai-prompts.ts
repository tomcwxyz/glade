export const SYSTEM_PROMPT = `You are an AI governance analyst for a social purpose organisation. You help organisations reflect on their decision-making patterns, review governance documents, and prepare thoughtful governance materials. Be concise, specific, and constructive. Use British English.`;

export function patternAnalysisPrompt(decisionsJson: string): string {
  return `Analyse the following governance decisions and identify patterns, trends, and areas for improvement. Focus on:
- Decision-making method distribution and appropriateness
- Follow-through on actions
- Review patterns (are decisions being reviewed?)
- Any decisions that might conflict or need reconciliation
- Governance health indicators

Provide a list of insights ("patterns"), each with:
- title: short headline (max 80 chars)
- content: 1-2 paragraph analysis
- relatedDecisionNumber: number of the most relevant decision (or null)

Decisions:
${decisionsJson}`;
}

export function reviewQuestionsPrompt(decisionJson: string): string {
  return `Generate 5 thoughtful review questions for this governance decision. The questions should help the organisation reflect on whether the decision:
- Has achieved its intended outcome
- Is still relevant and appropriate
- Has had unintended consequences
- Needs updating or amending
- Has been properly implemented

Format as a numbered list. Be specific to this decision's context.

Decision:
${decisionJson}`;
}

export function documentImpactPrompt(decisionJson: string, documentsJson: string): string {
  return `A new governance decision has been made. Analyse which existing governance documents might need updating as a result.

Provide a list of "suggestions", each with:
- documentTitle: the title of the document that may need updating
- reason: brief explanation of why it might need updating (1-2 sentences)

If no documents need updating, return an empty list. Only suggest genuinely relevant updates.

New decision:
${decisionJson}

Existing governance documents:
${documentsJson}`;
}

export function staleDocumentPrompt(documentsJson: string, decisionsJson: string): string {
  return `Review these governance documents and recent decisions. Identify documents that may be stale or need updating because recent decisions have changed the governance landscape.

A document may be stale if:
- A decision has been made that directly affects the document's subject matter
- The document hasn't been updated since a relevant decision was made
- The document references policies or structures that have since changed

Provide a list of stale "documents", each with:
- documentTitle: the title of the potentially stale document
- documentId: the document's ID
- reason: 1-2 sentences explaining why it may need review
- relatedDecisionNumbers: array of decision numbers that may affect this document

Only flag documents where there's a genuine reason for review. If all documents are up to date, return an empty list.

Governance documents (with updatedAt dates):
${documentsJson}

Recent decisions:
${decisionsJson}`;
}

export function draftDocumentUpdatePrompt(decisionJson: string, documentText: string): string {
  return `A governance decision has been made that may require updates to a governance document. Draft suggested changes to the document.

For each suggested change:
1. Quote the existing text that should be changed (use > blockquote)
2. Provide the suggested new text
3. Explain briefly why this change is needed

Use markdown formatting. Be specific about what text to change and what to replace it with. Only suggest changes that are directly warranted by the decision.

If no changes are needed, say so clearly.

Decision:
${decisionJson}

Current document text:
${documentText}`;
}

export function governanceDigestPrompt(decisionsJson: string, actionsJson: string, documentsJson: string): string {
  return `Create a monthly governance digest summarising recent governance activity. Cover:

1. **Decisions made** — summarise key decisions, grouped by theme if possible
2. **Action progress** — highlight completed actions and any overdue items
3. **Document updates** — note any documents that were updated
4. **Upcoming reviews** — list decisions with upcoming review dates
5. **Recommendations** — 2-3 actionable suggestions for governance improvement

Write in a clear, professional tone suitable for all members. Use markdown formatting with headings and bullet points. Keep it under 800 words.

Recent decisions (last 30 days):
${decisionsJson}

Actions:
${actionsJson}

Documents:
${documentsJson}`;
}

export function meetingSummaryPrompt(meetingJson: string): string {
  return `Generate a structured summary of this governance meeting. Include:

1. **Meeting overview** — date, type, duration, attendance
2. **Decisions made** — list each decision with its method and outcome
3. **Actions created** — list any actions assigned during the meeting
4. **Key discussions** — brief summary of discussion items covered
5. **Items skipped** — note any agenda items that were skipped
6. **Recommendations** — 1-2 suggestions for follow-up

Write in a clear, professional tone. Use markdown formatting. Keep it under 600 words.

Meeting data:
${meetingJson}`;
}

export function memberBriefingPrompt(decisionsJson: string, documentsJson: string): string {
  return `Create a comprehensive governance briefing for a new member joining this organisation. Cover:

1. **Governance overview** — How decisions are typically made, key governance structures
2. **Key active decisions** — The most important recent decisions and their status
3. **Governance documents** — Summary of what each document covers
4. **Action items** — Any significant ongoing actions
5. **Areas to be aware of** — Any decisions due for review or potential areas of change

Write in a welcoming, clear tone. Use markdown formatting with headings and bullet points. Keep it under 1000 words.

Recent decisions:
${decisionsJson}

Governance documents:
${documentsJson}`;
}

export function agendaDraftPrompt(
  meetingTitle: string,
  date: string,
  proposalsJson: string,
  topicsJson: string,
  recentDecisionsJson: string
): string {
  return `Draft a focused meeting agenda for the meeting below, drawing on the open proposals, topics, and recent decisions provided.

Guidelines:
- Suggest 3-7 agenda items in a sensible order (proposals ready for a decision first, then discussion, then information).
- For each item give: a short title, a one-sentence description, a type (one of for_decision, for_discussion, for_information), and an estimated duration in minutes.
- Turn proposals that are ready into "for_decision" items and open topics into "for_discussion" items. Only add a "for_information" item if genuinely warranted.
- Keep it realistic for a single meeting. Use British English.

Meeting: ${meetingTitle} (${date})

Open proposals:
${proposalsJson}

Topics:
${topicsJson}

Recent decisions:
${recentDecisionsJson}`;
}

export function governanceQaPrompt(
  question: string,
  decisionsJson: string,
  documentsJson: string
): string {
  return `Answer the member's question about this organisation's governance, grounded ONLY in the decisions and documents provided below.

Guidelines:
- Cite specific decisions by number (e.g. "decision #12") where relevant.
- If the answer isn't in the provided records, say so plainly rather than guessing or inventing.
- Be concise — a few sentences to a short paragraph. Use British English. Use markdown for any lists.

Question:
${question}

Decisions:
${decisionsJson}

Governance documents:
${documentsJson}`;
}

export function transcriptExtractionPrompt(
  transcript: string,
  meetingContext?: string
): string {
  return `Analyse this meeting transcript or notes and extract governance items into:
- decisions: each with title, description (what was decided and why), method (one of consent, majority_vote, advice_process, delegation, consensus, lazy_consensus), and outcome
- actions: each with description, ownerName (person responsible, or null), dueDate (YYYY-MM-DD, or null)
- topics: each with title, description, type (one of question, tension, agenda_suggestion)
- summary: a 2-3 sentence summary of the meeting

Rules:
- Only extract items that are clearly stated in the transcript. Do not infer or speculate.
- For decisions: only include items where a clear decision was made (not just discussed).
- For actions: only include items where someone was asked or agreed to do something specific.
- For topics: include unresolved questions, tensions raised, or items suggested for future agendas.
- If a field value is unknown, use null (for ownerName, dueDate) or omit the item entirely.
- For decision method, choose the closest match. If unclear, use "consensus".
- Return empty arrays if no items of that type are found.
${meetingContext ? `\nMeeting context:\n${meetingContext}\n` : ""}
Transcript:
${transcript}`;
}
