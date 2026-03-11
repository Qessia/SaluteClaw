import type { SaluteRequest } from "./types.js";
import { parseRequest } from "./inbound.js";
import {
  buildGreetingResponse,
  buildGoodbyeResponse,
  buildAnswerResponse,
  buildErrorResponse,
} from "./outbound.js";

interface WebhookDeps {
  logger: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
  handleMessage?: (envelope: ReturnType<typeof parseRequest>) => Promise<string | undefined>;
}

export function createWebhookHandler(accountId: string, deps: WebhookDeps) {
  return async (req: { body?: unknown }, res: { statusCode: number; end: (body: string) => void }) => {
    const raw = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as SaluteRequest;

    if (!raw?.messageName || !raw?.sessionId) {
      deps.logger.error("[salute] malformed request, missing messageName or sessionId");
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "bad request" }));
      return true;
    }

    deps.logger.info(`[salute] ${raw.messageName} session=${raw.sessionId}`);

    const envelope = parseRequest(raw, accountId);
    let response;

    try {
      switch (envelope.requestType) {
        case "launch":
          response = buildGreetingResponse(raw);
          break;

        case "close":
          response = buildGoodbyeResponse(raw);
          break;

        case "message":
        case "action": {
          const text = envelope.text;
          if (!text) {
            response = buildAnswerResponse(raw, "Пожалуйста, повторите ваш вопрос.", {
              autoListening: true,
            });
            break;
          }

          if (deps.handleMessage) {
            const reply = await deps.handleMessage(envelope);
            response = buildAnswerResponse(raw, reply ?? "Не удалось получить ответ.", {
              autoListening: true,
            });
          } else {
            response = buildAnswerResponse(
              raw,
              `Вы сказали: "${text}". Интеграция с OpenClaw пока в разработке.`,
              { autoListening: true },
            );
          }
          break;
        }

        default:
          response = buildErrorResponse(raw);
      }
    } catch (err) {
      deps.logger.error("[salute] handler error", err);
      response = buildErrorResponse(raw);
    }

    res.statusCode = 200;
    res.end(JSON.stringify(response));
    return true;
  };
}
