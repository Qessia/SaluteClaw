import type {
  SaluteRequest,
  SaluteInboundEnvelope,
  InboundRequestType,
} from "./types.js";

const MESSAGE_NAME_MAP: Record<string, InboundRequestType> = {
  RUN_APP: "launch",
  MESSAGE_TO_SKILL: "message",
  SERVER_ACTION: "action",
  CLOSE_APP: "close",
};

function extractText(req: SaluteRequest): string | undefined {
  if (req.messageName === "MESSAGE_TO_SKILL") {
    const msg = req.payload.message;
    return msg?.original_text || msg?.asr_normalized_message || undefined;
  }
  if (req.messageName === "SERVER_ACTION") {
    const sa = req.payload.server_action;
    const params = sa?.parameters as Record<string, unknown> | undefined;
    if (typeof params?.text === "string") return params.text;
  }
  return undefined;
}

function extractActionId(req: SaluteRequest): string | undefined {
  if (req.messageName === "SERVER_ACTION") {
    return req.payload.server_action?.action_id;
  }
  return undefined;
}

function deriveUserId(req: SaluteRequest): string {
  const uuid = req.uuid;
  return String(uuid.sub || uuid.userId || "unknown");
}

function deriveChatId(req: SaluteRequest): string {
  return `${req.sessionId}:${deriveUserId(req)}`;
}

export function parseRequest(
  req: SaluteRequest,
  accountId: string,
): SaluteInboundEnvelope {
  const requestType = MESSAGE_NAME_MAP[req.messageName];
  if (!requestType) {
    return {
      accountId,
      sessionId: req.sessionId,
      userId: deriveUserId(req),
      chatId: deriveChatId(req),
      requestType: "message",
      rawRequest: req,
    };
  }

  return {
    accountId,
    sessionId: req.sessionId,
    userId: deriveUserId(req),
    chatId: deriveChatId(req),
    requestType,
    text: extractText(req),
    actionId: extractActionId(req),
    rawRequest: req,
  };
}
