export type ActionMetadata = Record<string, unknown>;

export function parseActionMetadata(value: unknown): ActionMetadata | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("metadata must be an object");
  }
  const serialised = JSON.stringify(value);
  if (serialised.length > 8192) {
    throw new Error("metadata must be 8KB or smaller");
  }
  return value as ActionMetadata;
}

export function parseOptionalDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${field} must be a date string or null`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${field}`);
  return parsed;
}

export function parseOptionalText(
  value: unknown,
  field: string,
  max: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`${field} must be text or null`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new Error(`${field} must be ${max} characters or fewer`);
  return trimmed;
}
