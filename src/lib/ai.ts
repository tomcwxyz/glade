import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
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

export async function generateText(
  system: string,
  user: string,
  options?: { maxTokens?: number }
): Promise<string> {
  const anthropic = getAnthropicClient();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: options?.maxTokens ?? 2048,
    system,
    messages: [{ role: "user", content: user }],
  });

  const block = message.content[0];
  if (block.type === "text") return block.text;
  return "";
}
