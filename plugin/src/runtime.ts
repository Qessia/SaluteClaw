import type { SaluteInboundEnvelope, PluginRuntime } from "./types.js";
import path from "node:path";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Runtime store — holds the OpenClaw runtime reference injected at registration
// ---------------------------------------------------------------------------

let runtime: PluginRuntime | null = null;

export function setRuntime(rt: PluginRuntime): void {
  runtime = rt;
}

export function getRuntime(): PluginRuntime | null {
  return runtime;
}

// ---------------------------------------------------------------------------
// OpenClaw handoff — LLM-only mode (disableTools) for Salute VPS latency
// ---------------------------------------------------------------------------

const HANDOFF_TIMEOUT_MS = 12_000;
const DEFAULT_PROVIDER = "openai-codex";
const DEFAULT_MODEL = "gpt-5.3-codex-spark";
const DEFAULT_AUTH_PROFILE = "openai-codex:default";

const SALUTE_SYSTEM_PROMPT = `Ты — SaluteClaw, полезный AI-ассистент, интегрированный в экосистему Салют.
Отвечай кратко и по делу (1–3 предложения), потому что ответ будет озвучен голосом.
Если пользователь пишет на другом языке, отвечай на его языке.`;

export async function handleMessage(
  envelope: SaluteInboundEnvelope,
): Promise<string | undefined> {
  if (!runtime) return undefined;
  if (!envelope.text) return undefined;

  const sessionKey = `salute:${envelope.accountId}:${envelope.sessionId}`;

  const cfg = await runtime.config.loadConfig();
  await runtime.agent.ensureAgentWorkspace(cfg);

  const agentDir = runtime.agent.resolveAgentDir(cfg);
  const workspaceDir = runtime.agent.resolveAgentWorkspaceDir(cfg);
  const sessionFile = path.join(agentDir, "sessions", `${safeKey(sessionKey)}.jsonl`);

  const result = await runtime.agent.runEmbeddedPiAgent({
    sessionId: sessionKey,
    runId: randomUUID(),
    sessionFile,
    workspaceDir,
    prompt: envelope.text,
    timeoutMs: HANDOFF_TIMEOUT_MS,
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_MODEL,
    authProfileId: DEFAULT_AUTH_PROFILE,
    fastMode: true,
    disableTools: true,
    bootstrapContextMode: "lightweight",
    extraSystemPrompt: SALUTE_SYSTEM_PROMPT,
  });

  const direct = pickTextResult(result);
  if (direct) return direct;

  return undefined;
}

function safeKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function pickTextResult(result: Record<string, unknown>): string | undefined {
  const payloads = Array.isArray(result.payloads)
    ? (result.payloads as Array<Record<string, unknown>>)
    : [];
  for (const payload of payloads) {
    if (typeof payload.text === "string" && payload.text.trim()) {
      return payload.text.trim();
    }
  }

  const sentTexts = Array.isArray(result.messagingToolSentTexts)
    ? (result.messagingToolSentTexts as unknown[])
    : [];
  for (const t of sentTexts) {
    if (typeof t === "string" && t.trim()) return t.trim();
  }

  const candidates: unknown[] = [
    result.output,
    result.text,
    result.response,
    result.result,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (candidate && typeof candidate === "object") {
      const obj = candidate as Record<string, unknown>;
      if (typeof obj.text === "string" && obj.text.trim()) return obj.text.trim();
      if (typeof obj.output === "string" && obj.output.trim()) return obj.output.trim();
      if (typeof obj.content === "string" && obj.content.trim()) return obj.content.trim();
    }
  }
  return undefined;
}
