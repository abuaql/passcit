/**
 * Provider-agnostic contract for text generation.
 *
 * Services depend on this interface, never on a concrete provider. The
 * current implementation is Google Gemini (gemini-client.ts); swapping in a
 * different one means adding a file and repointing the factory — no service,
 * route, component or response contract changes.
 */

/** The provider isn't usable at all — not configured, or unreachable. */
export class AIUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIUnavailableError";
  }
}

/** The provider was reached but did not return usable content. */
export class AIGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIGenerationError";
  }
}

export interface AICompletionRequest {
  system: string;
  user: string;
  maxOutputTokens?: number;
  temperature?: number;
  /** Short label used in logs, e.g. "explanation" — never sent to the provider. */
  purpose: string;
}

/** Token usage as reported by the provider. */
export interface AITokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AICompletionResult {
  text: string;
  /**
   * Identifier of the model that produced this text, stored as `aiVersion`.
   * This is what makes selective regeneration possible later: you can find
   * every explanation still produced by an older model without touching
   * content already regenerated with a newer one.
   */
  model: string;
  /** Wall-clock duration, persisted as generationDurationMs for monitoring. */
  durationMs: number;
  /**
   * What the call consumed. Recorded against every generation so spend can be
   * analysed later; a provider that does not report usage returns zeros
   * rather than omitting the field, so callers never branch on its absence.
   */
  usage: AITokenUsage;
}

export interface AIProvider {
  readonly name: string;
  /** Whether generation can be attempted. Lets callers serve cached content instead of throwing. */
  isConfigured(): boolean;
  complete(request: AICompletionRequest): Promise<AICompletionResult>;
}
