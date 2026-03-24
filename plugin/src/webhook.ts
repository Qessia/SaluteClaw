import type { SaluteRequest, SaluteInboundEnvelope, PluginLogger } from "./types.js";
import { parseRequest } from "./inbound.js";
import {
  buildGreetingResponse,
  buildGoodbyeResponse,
  buildAnswerResponse,
  buildErrorResponse,
} from "./outbound.js";
import {
  cacheKey,
  consumeCachedResult,
  evictSession,
} from "./cache.js";
import { startBackgroundAgentRun } from "./runtime.js";

interface WebhookDeps {
  logger: PluginLogger;
  handleMessage?: (envelope: SaluteInboundEnvelope) => Promise<string | undefined>;
}

const REQUEST_TIMEOUT_MS = 15_000;

function looksLikeSaluteRequest(value: unknown): value is SaluteRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.messageName === "string" && typeof candidate.sessionId === "string";
}

function tryParseJsonString(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function readNodeRequestBody(
  req: { on?: unknown; readable?: boolean; [key: string]: unknown },
): Promise<string | null> {
  if (typeof req.on !== "function") return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const onData = (chunk: unknown) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    };
    const onEnd = () => resolve(Buffer.concat(chunks).toString("utf8"));
    const onError = (err: unknown) => reject(err);

    (req.on as (event: string, cb: (...args: unknown[]) => void) => void)("data", onData);
    (req.on as (event: string, cb: (...args: unknown[]) => void) => void)("end", onEnd);
    (req.on as (event: string, cb: (...args: unknown[]) => void) => void)("error", onError);
  });
}

async function parseSaluteRequest(
  req: { body?: unknown; [key: string]: unknown },
): Promise<SaluteRequest | null> {
  const stack: unknown[] = [
    req.body,
    req.rawBody,
    req.payload,
    req.requestBody,
    req.data,
  ];

  if (typeof req.json === "function") {
    try {
      stack.push(await (req.json as () => Promise<unknown>)());
    } catch {
      // no-op
    }
  }

  if (typeof req.text === "function") {
    try {
      stack.push(await (req.text as () => Promise<string>)());
    } catch {
      // no-op
    }
  }

  try {
    const streamText = await readNodeRequestBody(req);
    if (streamText) stack.push(streamText);
  } catch {
    // no-op
  }
  const seen = new Set<unknown>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    if (looksLikeSaluteRequest(current)) {
      return current;
    }

    if (typeof current === "string") {
      const parsed = tryParseJsonString(current);
      if (parsed) stack.push(parsed);
      continue;
    }

    if (current instanceof Uint8Array) {
      const parsed = tryParseJsonString(Buffer.from(current).toString("utf8"));
      if (parsed) stack.push(parsed);
      continue;
    }

    if (typeof current === "object") {
      const obj = current as Record<string, unknown>;

      // Handle Buffer serialized as plain object: { type: "Buffer", data: [...] }.
      if (
        obj.type === "Buffer"
        && Array.isArray(obj.data)
        && obj.data.every((x) => typeof x === "number")
      ) {
        const parsed = tryParseJsonString(
          Buffer.from(obj.data as number[]).toString("utf8"),
        );
        if (parsed) stack.push(parsed);
      }

      for (const key of ["body", "rawBody", "payload", "data", "json", "message"]) {
        if (key in obj) stack.push(obj[key]);
      }
    }
  }

  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label}: timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    const stack = typeof err.stack === "string" ? err.stack : "";
    return stack || `${err.name}: ${err.message}`;
  }
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function createWebhookHandler(accountId: string, deps: WebhookDeps) {
  return async (
    req: { body?: unknown; [key: string]: unknown },
    res: { statusCode: number; end: (body: string) => void },
  ) => {
    const raw = await parseSaluteRequest(req);

    if (!raw?.messageName || !raw?.sessionId) {
      const reqBodyType = req.body === null ? "null" : typeof req.body;
      deps.logger.error(
        `[salute] malformed request, missing messageName/sessionId bodyType=${reqBodyType} keys=${Object.keys(req).join(",")}`,
      );
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "bad request" }));
      return true;
    }

    deps.logger.info(
      `[salute] ${raw.messageName} session=${raw.sessionId} account=${accountId}`,
    );

    const envelope = parseRequest(raw, accountId);
    let response;

    try {
      switch (envelope.requestType) {
        case "launch":
          response = buildGreetingResponse(raw);
          break;

        case "close": {
          const closeKey = cacheKey(accountId, envelope.sessionId);
          evictSession(closeKey);
          deps.logger.info(`[salute] session closed, evicted cache for ${closeKey}`);
          response = buildGoodbyeResponse(raw);
          break;
        }

        case "message":
        case "action": {
          const text = envelope.text;
          if (!text) {
            response = buildAnswerResponse(raw, "Пожалуйста, повторите ваш вопрос.", {
              autoListening: true,
            });
            break;
          }

          const key = cacheKey(accountId, envelope.sessionId);
          const cached = consumeCachedResult(key);

          if (deps.handleMessage) {
            if (cached) {
              deps.logger.info(
                `[salute] delivering cached background result for ${key} (age ${Date.now() - cached.timestamp}ms)`,
              );
            }

            const fastReply = await withTimeout(
              deps.handleMessage(envelope),
              REQUEST_TIMEOUT_MS,
              `salute:handleMessage:${accountId}`,
            );

            let replyText: string;
            if (cached && fastReply) {
              replyText = `${cached.text}\n\n---\n\n${fastReply}`;
            } else if (cached) {
              replyText = cached.text;
            } else {
              replyText = fastReply ?? "Не удалось получить ответ.";
            }

            response = buildAnswerResponse(raw, replyText, { autoListening: true });

            startBackgroundAgentRun(envelope);
          } else {
            deps.logger.warn("[salute] handleMessage not wired — returning echo stub");
            response = buildAnswerResponse(
              raw,
              `Вы сказали: «${text}». Интеграция с OpenClaw пока в разработке.`,
              { autoListening: true },
            );
          }
          break;
        }

        default:
          response = buildErrorResponse(raw);
      }
    } catch (err) {
      const isTimeout = err instanceof Error && err.message.includes("timed out");
      const details = formatError(err);
      deps.logger.error(
        `[salute] handler error${isTimeout ? " (timeout)" : ""}: ${details}`,
      );
      response = buildAnswerResponse(
        raw,
        isTimeout
          ? "Извините, ответ занял слишком много времени. Попробуйте ещё раз."
          : "Извините, произошла ошибка. Попробуйте ещё раз.",
        { autoListening: true },
      );
    }

    res.statusCode = 200;
    res.end(JSON.stringify(response));
    return true;
  };
}
