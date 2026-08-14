import { GoogleGenAI } from "@google/genai";
import { logger } from "@/lib/logger";
import {
  AIGenerationError,
  AIUnavailableError,
  type AICompletionRequest,
  type AICompletionResult,
  type AIProvider,
} from "@/lib/ai/provider";

/**
 * Google Gemini implementation of AIProvider.
 *
 * Nothing above this file knows which provider is in use: services call
 * getAIProvider().complete() and receive the same AICompletionResult shape as
 * before, so caching, cost logging, aiVersion, retry, timeout and every API
 * response contract are untouched by the switch.
 *
 * Gemini errors are never surfaced to callers. They are logged here and
 * re-thrown as the provider-neutral AIUnavailableError / AIGenerationError the
 * routes already understand.
 */

/**
 * Last-resort model names, only used if discovery fails.
 *
 * Deliberately NOT the primary mechanism: Google retires aliases and
 * restricts them to existing projects, so any hardcoded name eventually
 * returns 404 for someone. Two names picked this way have already died in
 * this project. The list below exists purely so the provider still has
 * something to try when the models API itself is unreachable.
 */
const STATIC_FALLBACK_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_000;
const MOCK_MODEL = "development-mock";
const MODEL_CACHE_TTL_MS = 30 * 60 * 1000;
/** How many models one request will try before giving up, so a broken project fails fast. */
const MAX_MODELS_PER_REQUEST = 4;

/** Whether a real API key is present. Absent means development mode, not failure. */
function hasApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Discovered model names that support generateContent, best first. */
let discoveredModels: string[] | null = null;
let discoveredAt = 0;
/** Models this project provably cannot use — 404 or a zero quota. Never retried. */
const unusableModels = new Set<string>();
/** Last model that actually worked, tried first so the common path is one call. */
let lastGoodModel: string | null = null;

/**
 * Ranks discovered models: cheap general-purpose text models first.
 *
 * Lower is better. Specialised models (image, audio, embedding) and preview
 * builds are pushed to the back — they either cannot serve these prompts or
 * are the most likely to disappear.
 */
function modelRank(name: string): number {
  const n = name.toLowerCase();
  if (/embedding|imagen|veo|tts|audio|vision|live|aqa/.test(n)) return 900;
  let rank = 500;
  if (n.includes("flash-lite")) rank = 100;
  else if (n.includes("flash")) rank = 200;
  else if (n.includes("pro")) rank = 400;
  if (n.includes("latest")) rank -= 10;
  if (/preview|exp|thinking/.test(n)) rank += 50;
  return rank;
}

/**
 * Asks the API which models this key can actually call.
 *
 * This is the fix for the whole class of "model no longer available" failures:
 * instead of shipping a guess and waiting for it to be retired, the provider
 * reads the current list. Cached, because it changes rarely and should not add
 * a round trip to every generation.
 */
async function discoverModels(ai: GoogleGenAI): Promise<string[]> {
  const fresh = discoveredModels && Date.now() - discoveredAt < MODEL_CACHE_TTL_MS;
  if (fresh && discoveredModels) return discoveredModels;

  try {
    const names: string[] = [];
    const pager = await ai.models.list();
    let page = pager.page;
    while (page.length > 0) {
      for (const model of page) {
        const supportsText = model.supportedActions?.includes("generateContent") ?? false;
        if (!supportsText || !model.name) continue;
        names.push(model.name.replace(/^models\//, ""));
      }
      page = pager.hasNextPage() ? await pager.nextPage() : [];
    }
    names.sort((a, b) => modelRank(a) - modelRank(b));
    discoveredModels = names;
    discoveredAt = Date.now();
    // A refresh re-opens models previously marked unusable, so a quota or
    // availability change heals on its own within the cache window instead of
    // needing a restart.
    unusableModels.clear();
    // The full list is a development aid — useful when answering "which model
    // should I configure?", but a long line to repeat in production every
    // cache window. Production instead gets one short line when the served
    // model actually changes, which is the part worth alerting on.
    logger.debug("ai.gemini", `Models available for generateContent: ${names.join(", ") || "none"}`);
    return names;
  } catch (error) {
    logger.warn("ai.gemini", "Could not list models; falling back to static names", error);
    return [];
  }
}

type ErrorKind = "unusable" | "transient" | "fatal";

/**
 * Classifies a provider failure.
 *
 * The distinction that matters: a 429 saying "limit: 0" is NOT a rate limit
 * that will pass in a minute — it means this project has no quota for that
 * model at all, so the only useful response is to try a different model.
 * A 429 with a real limit is genuinely transient and gets the retry.
 */
function classifyError(error: unknown): ErrorKind {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/\b404\b|NOT_FOUND|no longer available|is not supported/i.test(text)) return "unusable";
  if (/limit:\s*0\b/i.test(text)) return "unusable";
  if (/\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|INTERNAL/i.test(text)) {
    return "transient";
  }
  return "fatal";
}

/** Small stable hash so mock content differs per prompt while staying deterministic. */
function stableTag(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 6);
}

/**
 * Deterministic stand-in used when GEMINI_API_KEY is absent.
 *
 * Development must never be blocked by a missing key: the study flow stays
 * fully clickable, caching and status transitions exercise exactly as they do
 * in production, and nothing 503s or crashes. Output is deterministic so the
 * same question yields the same text every time, and each purpose satisfies
 * the contract its service expects — in particular translation must be valid
 * JSON with question and answer, or TranslationService would reject it.
 *
 * Marked with the model name "development-mock", which is stored in aiVersion,
 * so mock content is identifiable in the database and in analytics and can be
 * regenerated for real later.
 */
function mockCompletion(request: AICompletionRequest, startedAt: number): AICompletionResult {
  const tag = stableTag(`${request.purpose}:${request.user}`);
  let text: string;

  switch (request.purpose) {
    case "translation":
      text = JSON.stringify({
        question: `[development mode ${tag}] Translated question placeholder.`,
        answer: `[development mode ${tag}] Translated answer placeholder.`,
      });
      break;
    case "memoryTip":
      text =
        `[development mode ${tag}] Placeholder memory aid. ` +
        "Set GEMINI_API_KEY to generate real content.";
      break;
    default:
      text =
        `[development mode ${tag}] Placeholder explanation.\n\n` +
        "This text is generated locally because no GEMINI_API_KEY is configured, " +
        "so the study flow stays usable without calling the API.\n\n" +
        "- Caching, status transitions and analytics all behave exactly as in production\n" +
        "- Set GEMINI_API_KEY to replace this with a real explanation";
      break;
  }

  return {
    text,
    model: MOCK_MODEL,
    durationMs: Date.now() - startedAt,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };
}

/** Rejects if the underlying call outruns the budget, without depending on SDK-specific cancellation. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DEADLINE_EXCEEDED: request timed out")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Models to try, best first.
 *
 * The last model that worked leads, so the steady state is a single call.
 * An explicitly configured GEMINI_MODEL is honoured next, then whatever the
 * API says this key can use, then the static names as a last resort. Anything
 * already proven unusable is dropped, and the list is capped so a thoroughly
 * broken project fails quickly rather than walking every model on every request.
 */
async function buildCandidates(ai: GoogleGenAI): Promise<string[]> {
  const configured = process.env.GEMINI_MODEL?.trim();
  const discovered = await discoverModels(ai);
  const ordered = [
    ...(lastGoodModel ? [lastGoodModel] : []),
    ...(configured ? [configured] : []),
    ...discovered,
    ...STATIC_FALLBACK_MODELS,
  ];
  return ordered
    .filter((model, index) => ordered.indexOf(model) === index)
    .filter((model) => !unusableModels.has(model))
    .slice(0, MAX_MODELS_PER_REQUEST);
}

export const geminiProvider: AIProvider = {
  name: "gemini",

  isConfigured() {
    return hasApiKey();
  },

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const startedAt = Date.now();

    // No key: serve a deterministic stand-in rather than failing. Production
    // is unaffected because production has a key.
    if (!hasApiKey()) {
      return mockCompletion(request, startedAt);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const callModel = (model: string) =>
      ai.models.generateContent({
        model,
        contents: request.user,
        config: {
          systemInstruction: request.system,
          temperature: request.temperature ?? 0.4,
          maxOutputTokens: request.maxOutputTokens ?? 700,
        },
      });

    // One retry per model, and only for genuinely transient faults. A model
    // that is gone, or has no quota on this project, is never retried — that
    // advances to the next candidate instead.
    const attempt = async (model: string) => {
      try {
        return await withTimeout(callModel(model), REQUEST_TIMEOUT_MS);
      } catch (error) {
        if (classifyError(error) !== "transient") throw error;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return await withTimeout(callModel(model), REQUEST_TIMEOUT_MS);
      }
    };

    const candidates = await buildCandidates(ai);
    if (candidates.length === 0) {
      logger.error("ai.gemini", "No Gemini model is usable with this API key.");
      throw new AIUnavailableError("Could not reach the AI service.");
    }

    let response: Awaited<ReturnType<typeof callModel>> | undefined;
    let servedModel = candidates[0]!;
    let lastError: unknown;

    for (const model of candidates) {
      try {
        response = await attempt(model);
        servedModel = model;
        // Only announced when it changes, so the steady state logs nothing at
        // all while a switch — the thing worth noticing — is still visible.
        if (lastGoodModel !== model) {
          logger.info("ai.gemini", `Generating with model ${model}`);
        }
        lastGoodModel = model;
        break;
      } catch (error) {
        lastError = error;
        if (classifyError(error) === "unusable") {
          // Retired, restricted, or zero quota on this project. Remember it so
          // later requests skip straight past instead of paying for the same
          // failure every time.
          unusableModels.add(model);
          if (lastGoodModel === model) lastGoodModel = null;
          // Kept at warn: bounded by unusableModels, and actionable — it means
          // a model has been retired or has no quota on this project. The full
          // provider error is development detail.
          logger.warn("ai.gemini", `Model ${model} is not usable with this key; trying the next`);
          logger.debug("ai.gemini", `Reason ${model} was rejected`, error);
          continue;
        }
        // A bad key or malformed request fails identically on every model, so
        // walking the rest would only delay the same error.
        logger.error("ai.gemini", `Request failed for ${request.purpose} on ${model}`, error);
        throw new AIUnavailableError("Could not reach the AI service.");
      }
    }

    if (!response) {
      logger.error(
        "ai.gemini",
        `No usable model for ${request.purpose}. Tried: ${candidates.join(", ")}`,
        lastError
      );
      throw new AIUnavailableError("Could not reach the AI service.");
    }

    const text = response.text?.trim();
    if (!text) {
      logger.warn("ai.gemini", `Empty response for ${request.purpose}`);
      throw new AIGenerationError("AI service returned empty content.");
    }

    const usage = response.usageMetadata;
    const promptTokens = usage?.promptTokenCount ?? 0;
    const completionTokens = usage?.candidatesTokenCount ?? 0;

    return {
      text,
      // The response names the model actually served where available; falling
      // back to whichever chain entry succeeded. Either way aiVersion records
      // what really produced the text, not what was merely requested.
      model: response.modelVersion ?? servedModel,
      durationMs: Date.now() - startedAt,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: usage?.totalTokenCount ?? promptTokens + completionTokens,
      },
    };
  },
};

export function getAIProvider(): AIProvider {
  return geminiProvider;
}
