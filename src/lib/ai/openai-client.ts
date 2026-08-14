import { logger } from "@/lib/logger";
import {
  AIGenerationError,
  AIUnavailableError,
  type AICompletionRequest,
  type AICompletionResult,
  type AIProvider,
} from "@/lib/ai/provider";

/**
 * OpenAI implementation of AIProvider.
 *
 * Uses fetch against the REST endpoint rather than the `openai` package: no
 * dependency to install or keep in step, and every failure mode stays
 * visible in one file. Nothing above this module knows how the call is made.
 */

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_000;

function resolveModel(): string {
  return process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
}

function shouldRetry(status: number): boolean {
  // 429 is a rate limit and 5xx is transient; both are worth one more
  // attempt. Everything else (401, 400, 404) fails identically on a retry,
  // so retrying only delays the error the user is waiting on.
  return status === 429 || status >= 500;
}

async function attempt(request: AICompletionRequest, apiKey: string, model: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: request.temperature ?? 0.4,
        max_tokens: request.maxOutputTokens ?? 700,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const openAIProvider: AIProvider = {
  name: "openai",

  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  },

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new AIUnavailableError("OPENAI_API_KEY is not configured.");

    const model = resolveModel();
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await attempt(request, apiKey, model);
      if (shouldRetry(response.status)) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        response = await attempt(request, apiKey, model);
      }
    } catch (error) {
      logger.error("ai.openai", `Request failed for ${request.purpose}`, error);
      throw new AIUnavailableError("Could not reach the AI service.");
    }

    if (!response.ok) {
      // Status and purpose only: response bodies can echo submitted text.
      logger.error("ai.openai", `Non-OK response (${response.status}) for ${request.purpose}`);
      throw new AIGenerationError(`AI service returned ${response.status}.`);
    }

    let text: string | undefined;
    let servedModel = model;
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    try {
      const json = (await response.json()) as {
        model?: string;
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      text = json.choices?.[0]?.message?.content?.trim();
      // The response names the model actually served, which can differ from
      // the alias requested — that is the one that was billed, so record it.
      if (json.model) servedModel = json.model;
      const prompt = json.usage?.prompt_tokens ?? 0;
      const completion = json.usage?.completion_tokens ?? 0;
      usage = {
        promptTokens: prompt,
        completionTokens: completion,
        totalTokens: json.usage?.total_tokens ?? prompt + completion,
      };
    } catch (error) {
      logger.error("ai.openai", `Malformed response for ${request.purpose}`, error);
      throw new AIGenerationError("AI service returned a malformed response.");
    }

    // Throwing rather than returning empty text is deliberate: a caller must
    // never mistake a failure for legitimately empty content and cache it.
    if (!text) throw new AIGenerationError("AI service returned empty content.");

    return { text, model: servedModel, durationMs: Date.now() - startedAt, usage };
  },
};

/** The provider in use. Swapping providers is a change to this function alone. */
export function getAIProvider(): AIProvider {
  return openAIProvider;
}
