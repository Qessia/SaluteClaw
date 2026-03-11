import type {
  SaluteRequest,
  SaluteResponse,
  SaluteButton,
} from "./types.js";
import {
  truncateForVoice,
  truncateForBubble,
  stripNulls,
  sanitizeText,
} from "./mapper.js";

const GREETING = "Привет! Я помощник OpenClaw. Задайте мне вопрос.";
const FALLBACK = "Извините, произошла ошибка. Попробуйте ещё раз.";
const GOODBYE = "До свидания!";

export function buildAnswerResponse(
  req: SaluteRequest,
  text: string,
  options?: {
    suggestions?: string[];
    autoListening?: boolean;
    finished?: boolean;
  },
): SaluteResponse {
  const pronounce = sanitizeText(truncateForVoice(text));
  const bubbleText = truncateForBubble(text);

  const buttons: SaluteButton[] = (options?.suggestions ?? []).map((s) => ({
    title: s,
    actions: [{ type: "text" as const, text: s, should_send_to_backend: true }],
  }));

  const payload: SaluteResponse["payload"] = {
    pronounceText: pronounce,
    pronounceTextType: "application/text",
    items: [{ bubble: { text: bubbleText } }],
    auto_listening: options?.autoListening ?? false,
    finished: options?.finished ?? false,
  };

  if (buttons.length > 0) {
    payload.suggestions = { buttons };
  }

  return stripNulls({
    sessionId: req.sessionId,
    messageId: req.messageId,
    uuid: req.uuid,
    messageName: "ANSWER_TO_USER",
    payload,
  });
}

export function buildGreetingResponse(req: SaluteRequest): SaluteResponse {
  return buildAnswerResponse(req, GREETING, {
    autoListening: true,
    finished: false,
  });
}

export function buildGoodbyeResponse(req: SaluteRequest): SaluteResponse {
  return buildAnswerResponse(req, GOODBYE, { finished: true });
}

export function buildErrorResponse(req: SaluteRequest): SaluteResponse {
  return buildAnswerResponse(req, FALLBACK, {
    autoListening: true,
    finished: false,
  });
}
