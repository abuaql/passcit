/**
 * Local price table used to turn exact token counts into an estimated cost.
 *
 * Prices are USD per 1,000,000 tokens and are a snapshot — Google changes
 * them, so this WILL drift. That is why AIGenerationLog stores the raw token
 * counts as well: those are reported by the API and stay exact, so any past
 * generation can be re-costed from this table at any time.
 *
 * An unknown model returns null rather than guessing, so a wrong price is
 * never silently recorded as though it were known.
 */
interface ModelPrice {
  inputPerMillion: number;
  outputPerMillion: number;
}

const MODEL_PRICES: Record<string, ModelPrice> = {
  "gemini-2.5-flash": { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  "gemini-2.5-flash-lite": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  "gemini-2.5-pro": { inputPerMillion: 1.25, outputPerMillion: 10 },
};

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number
): number | null {
  const price = MODEL_PRICES[model];
  if (!price) return null;
  return (
    (promptTokens / 1_000_000) * price.inputPerMillion +
    (completionTokens / 1_000_000) * price.outputPerMillion
  );
}
