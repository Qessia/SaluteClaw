// ---------------------------------------------------------------------------
// Salute SmartApp API inbound request types
// ---------------------------------------------------------------------------

export type SaluteMessageName =
  | "RUN_APP"
  | "MESSAGE_TO_SKILL"
  | "SERVER_ACTION"
  | "CLOSE_APP";

export interface SaluteUuid {
  userChannel: string;
  sub: string;
  userId: number | string;
}

export interface SaluteAppInfo {
  projectId: string;
  applicationId?: string;
  appversionId?: string;
  frontendType?: string;
  systemName?: string;
  frontendEndpoint?: string;
  frontendStateId?: string;
}

export interface SaluteDevice {
  platformType: string;
  platformVersion?: string;
  surface?: string;
  surfaceVersion?: string;
  devicesId?: string;
  features?: Record<string, unknown>;
  capabilities?: {
    screen?: { available: boolean; width?: number; height?: number };
    mic?: { available: boolean };
    speak?: { available: boolean };
  };
}

export interface SaluteCharacter {
  id: string;
  name: string;
  gender?: string;
  appeal?: string;
}

export interface SaluteMessage {
  original_text: string;
  normalized_text?: string;
  asr_normalized_message?: string;
  entities?: Record<string, unknown>;
  tokenized_elements_list?: unknown[];
}

export interface SaluteServerAction {
  action_id: string;
  parameters?: Record<string, unknown>;
  app_info?: SaluteAppInfo;
}

export interface SalutePayload {
  app_info?: SaluteAppInfo;
  device?: SaluteDevice;
  character?: SaluteCharacter;
  message?: SaluteMessage;
  server_action?: SaluteServerAction;
  intent?: string;
  original_intent?: string;
  projectName?: string;
  new_session?: boolean;
  meta?: Record<string, unknown>;
  strategies?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SaluteRequest {
  sessionId: string;
  messageId: number;
  uuid: SaluteUuid;
  messageName: SaluteMessageName;
  payload: SalutePayload;
}

// ---------------------------------------------------------------------------
// Salute SmartApp API outbound response types
// ---------------------------------------------------------------------------

export interface SaluteButtonAction {
  type: "text" | "server_action" | "deep_link";
  text?: string;
  should_send_to_backend?: boolean;
  server_action?: SaluteServerAction;
  deep_link?: string;
}

export interface SaluteButton {
  title: string;
  actions: SaluteButtonAction[];
}

export interface SaluteResponsePayload {
  pronounceText: string;
  pronounceTextType?: string;
  items?: Array<{
    bubble?: { text: string; textMarkup?: string; markdown?: boolean };
  }>;
  suggestions?: { buttons: SaluteButton[] };
  auto_listening?: boolean;
  finished?: boolean;
  [key: string]: unknown;
}

export type SaluteResponseMessageName =
  | "ANSWER_TO_USER"
  | "NOTHING_FOUND"
  | "ERROR";

export interface SaluteResponse {
  sessionId: string;
  messageId: number;
  uuid: SaluteUuid;
  messageName: SaluteResponseMessageName;
  payload: SaluteResponsePayload;
}

// ---------------------------------------------------------------------------
// Internal normalized envelope
// ---------------------------------------------------------------------------

export type InboundRequestType = "launch" | "message" | "action" | "close";

export interface SaluteInboundEnvelope {
  accountId: string;
  sessionId: string;
  userId: string;
  chatId: string;
  requestType: InboundRequestType;
  text?: string;
  actionId?: string;
  rawRequest: SaluteRequest;
}

// ---------------------------------------------------------------------------
// Plugin account config
// ---------------------------------------------------------------------------

export interface SaluteAccountConfig {
  enabled?: boolean;
  webhookPath?: string;
  publicBaseUrl?: string;
}
