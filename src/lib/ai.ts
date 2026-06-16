import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";

// Current per-space AI model. Bare ID (no date suffix) — supports structured
// outputs and adaptive thinking. Best speed/intelligence balance for the
// multi-tenant governance features.
const AI_MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export function isAiAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function isAiEnabled(spaceSettings: unknown): boolean {
  if (!isAiAvailable()) return false;
  const settings = spaceSettings as Record<string, unknown> | null;
  return settings?.aiEnabled === true;
}

/** Map an SDK error to a clean, user-safe message (no raw internals). */
function aiErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.RateLimitError)
    return "The AI service is busy right now. Please try again in a moment.";
  if (e instanceof Anthropic.AuthenticationError)
    return "AI is not configured correctly (authentication failed). Check the API key.";
  if (e instanceof Anthropic.APIError)
    return `AI request failed (${e.status ?? "error"}). Please try again.`;
  return e instanceof Error ? e.message : "AI request failed.";
}

/**
 * Cap a serialized prompt input so large decision/document logs don't blow up
 * the prompt (and per-call cost). Truncates with a visible marker.
 */
export function capInput(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n…[truncated]";
}

/** Free-text generation. Throws a clean Error on failure. */
export async function generateText(
  system: string,
  user: string,
  options?: { maxTokens?: number }
): Promise<string> {
  const anthropic = getAnthropicClient();
  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: options?.maxTokens ?? 2048,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = message.content[0];
    return block && block.type === "text" ? block.text : "";
  } catch (e) {
    throw new Error(aiErrorMessage(e));
  }
}

/**
 * Structured generation via the API's structured-outputs feature — the model is
 * constrained to the given JSON Schema and the SDK validates + parses the result.
 * Replaces fragile fence-stripping + JSON.parse on free text. The caller declares
 * the result type `T`; `schema` must be a JSON Schema object (`type: "object"`,
 * `additionalProperties: false`). Throws a clean Error on failure.
 */
export async function generateStructured<T>(
  system: string,
  user: string,
  schema: Record<string, unknown>,
  options?: { maxTokens?: number }
): Promise<T> {
  const anthropic = getAnthropicClient();
  try {
    const format = jsonSchemaOutputFormat(
      schema as Parameters<typeof jsonSchemaOutputFormat>[0]
    );
    const message = await anthropic.messages.parse({
      model: AI_MODEL,
      max_tokens: options?.maxTokens ?? 2048,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format },
    });
    if (message.parsed_output == null) {
      throw new Error("AI returned no structured output.");
    }
    return message.parsed_output as T;
  } catch (e) {
    throw new Error(aiErrorMessage(e));
  }
}
