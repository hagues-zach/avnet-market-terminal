import Anthropic from "@anthropic-ai/sdk";

// One place for the Claude client, the model and the "is it switched on" check.
// Server-only. The client reads its credentials from the environment
// (ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN); nothing is hardcoded.

export const MODEL = "claude-opus-5-5";

/** False when no credential is present, so pages can say AI is off instead of failing. */
export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | undefined;
export function claude(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/** A short, user-presentable reason for a failed call. */
export function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "The Claude API key was rejected.";
  if (error instanceof Anthropic.PermissionDeniedError) return "The Claude API key is not allowed to use this model.";
  if (error instanceof Anthropic.RateLimitError) return "Claude is rate limiting requests; it will be retried on a later refresh.";
  if (error instanceof Anthropic.BadRequestError) return `Claude rejected the request: ${error.message}`;
  if (error instanceof Anthropic.APIConnectionError) return "Claude could not be reached.";
  if (error instanceof Anthropic.APIError) return `Claude returned an error (${error.status ?? "unknown"}).`;
  return error instanceof Error ? error.message : "Unknown error";
}
