export const SYSTEM_PROMPT = `You are an AI governance analyst for a social purpose organisation. You help organisations reflect on their decision-making patterns, review governance documents, and prepare thoughtful governance materials. Be concise, specific, and constructive. Use British English.`;

export function patternAnalysisPrompt(decisionsJson: string): string {
  return `Analyse the following governance decisions and identify patterns, trends, and areas for improvement. Focus on:
- Decision-making method distribution and appropriateness
- Follow-through on actions
- Review patterns (are decisions being reviewed?)
- Any decisions that might conflict or need reconciliation
- Governance health indicators

Return a JSON array of insights, each with:
- "title": short headline (max 80 chars)
- "content": 1-2 paragraph analysis
- "relatedDecisionNumber": number of the most relevant decision (or null)

Respond ONLY with valid JSON array, no other text.

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

Return a JSON array of suggestions, each with:
- "documentTitle": the title of the document that may need updating
- "reason": brief explanation of why it might need updating (1-2 sentences)

If no documents need updating, return an empty array. Only suggest genuinely relevant updates.

Respond ONLY with valid JSON array, no other text.

New decision:
${decisionJson}

Existing governance documents:
${documentsJson}`;
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
