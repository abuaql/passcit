/**
 * Minimal, dependency-free structured logging. No paid service, no new
 * package — just a consistent shape instead of scattered, differently-
 * formatted `console.error("some string:", error)` calls.
 *
 * In production, output is JSON lines (one object per line — easy to
 * parse or ship to whatever log aggregator the deployment target uses,
 * without this app needing to know or care which one). In development,
 * it's a readable one-line format instead.
 */

type LogLevel = "info" | "warn" | "error";

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error;
}

function emit(level: LogLevel, context: string, message: string, error?: unknown) {
  const isProd = process.env.NODE_ENV === "production";
  const timestamp = new Date().toISOString();

  if (isProd) {
    const entry = {
      level,
      context,
      message,
      timestamp,
      ...(error !== undefined ? { error: serializeError(error) } : {}),
    };
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
    return;
  }

  const prefix = `[${timestamp}] ${level.toUpperCase()} ${context}:`;
  if (level === "error") console.error(prefix, message, error ?? "");
  else if (level === "warn") console.warn(prefix, message, error ?? "");
  else console.log(prefix, message);
}

export const logger = {
  info: (context: string, message: string) => emit("info", context, message),
  warn: (context: string, message: string, error?: unknown) => emit("warn", context, message, error),
  /** `context` should identify where this happened, e.g. "api.admin.questions.create". */
  error: (context: string, message: string, error?: unknown) => emit("error", context, message, error),
};
