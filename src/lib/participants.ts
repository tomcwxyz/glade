/**
 * Decision participants: linked space members or named guests, with how each
 * took part (participated / abstained / left the room) and any declared interest.
 *
 * Kept free of app imports so it can be unit-tested with `node --test`.
 */

export const PARTICIPATION = ["participated", "abstained", "left_room"] as const;
export type Participation = (typeof PARTICIPATION)[number];

export const PARTICIPATION_LABELS: Record<Participation, string> = {
  participated: "Took part",
  abstained: "Abstained",
  left_room: "Left the room",
};

export type ParticipantInput = {
  /** Space member's user id; null/absent for a guest. */
  userId?: string | null;
  name: string;
  participation?: Participation;
  /** Declared interest (conflict), if any. */
  interest?: string | null;
};

export type ResolvedParticipant = {
  userId: string | null;
  name: string;
  participation: Participation;
  interest: string | null;
};

export type MemberRef = { id: string; name: string | null; email?: string | null };

function memberLabel(m: MemberRef): string {
  return (m.name || m.email || "").trim();
}

/**
 * Read the participants form field: a JSON array of ParticipantInput, or a
 * legacy comma-separated list of names. Malformed input yields [].
 */
export function parseParticipantsField(raw: unknown): ParticipantInput[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  const text = raw.trim();
  if (text.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
        .map((p) => ({
          userId: typeof p.userId === "string" ? p.userId : null,
          name: typeof p.name === "string" ? p.name : "",
          participation: (PARTICIPATION as readonly unknown[]).includes(p.participation)
            ? (p.participation as Participation)
            : undefined,
          interest: typeof p.interest === "string" ? p.interest : null,
        }));
    } catch {
      return [];
    }
  }
  return text.split(",").map((name) => ({ name }));
}

/**
 * Validate and normalise participants against the space's members:
 * - a userId that isn't a member is dropped back to a guest with its name;
 * - a guest whose name matches exactly one member (case-insensitive) is linked;
 * - member names come from the member record, not the input;
 * - duplicates (same member, or same guest name) are merged, first wins.
 */
export function resolveParticipants(inputs: ParticipantInput[], members: MemberRef[]): ResolvedParticipant[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  const byName = new Map<string, MemberRef[]>();
  for (const m of members) {
    const key = memberLabel(m).toLowerCase();
    if (!key) continue;
    byName.set(key, [...(byName.get(key) ?? []), m]);
  }

  const out: ResolvedParticipant[] = [];
  const seen = new Set<string>();
  for (const input of inputs) {
    const typedName = (input.name ?? "").trim();
    let member = input.userId ? byId.get(input.userId) : undefined;
    if (!member && typedName) {
      const matches = byName.get(typedName.toLowerCase());
      if (matches?.length === 1) member = matches[0];
    }
    const name = member ? memberLabel(member) : typedName;
    if (!name) continue;

    const key = member ? `u:${member.id}` : `g:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      userId: member?.id ?? null,
      name,
      participation: input.participation ?? "participated",
      interest: input.interest?.trim() || null,
    });
  }
  return out;
}

/** Display names, for the legacy decisions.participants mirror. */
export function participantNames(list: ResolvedParticipant[]): string[] {
  return list.map((p) => p.name);
}

/** One-line summaries for revision diffs, e.g. "Ben (abstained; interest: trustee of grantee)". */
export function participantSummaries(list: ResolvedParticipant[]): string[] {
  return list.map((p) => {
    const notes: string[] = [];
    if (p.participation !== "participated") notes.push(PARTICIPATION_LABELS[p.participation].toLowerCase());
    if (p.interest) notes.push(`interest: ${p.interest}`);
    if (!p.userId) notes.push("guest");
    return notes.length ? `${p.name} (${notes.join("; ")})` : p.name;
  });
}

/**
 * Participants for a decision taken in a live meeting: everyone in the session
 * except observers, plus anyone who responded. A participant whose latest
 * response was "abstain" is recorded as abstained.
 */
export function participantsFromLiveSession(
  session: Record<string, { name: string; role: string }>,
  responses: { participantId: string; name: string; value: string; respondedAt?: string }[]
): ParticipantInput[] {
  const latest = new Map<string, { value: string; at: string }>();
  for (const r of responses) {
    const prev = latest.get(r.participantId);
    const at = r.respondedAt ?? "";
    if (!prev || at >= prev.at) latest.set(r.participantId, { value: r.value, at });
  }

  const out: ParticipantInput[] = [];
  const seen = new Set<string>();
  const add = (id: string, name: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      userId: id,
      name,
      participation: latest.get(id)?.value === "abstain" ? "abstained" : "participated",
    });
  };
  for (const [id, p] of Object.entries(session)) {
    if (p.role !== "observer") add(id, p.name);
  }
  for (const r of responses) add(r.participantId, r.name);
  return out;
}
