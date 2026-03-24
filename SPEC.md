# SaluteClaw Spec

## Goal

Connect a Salute SmartApp to an existing personal OpenClaw server. A user launches the SmartApp, sends a request by voice or text, the request is forwarded into OpenClaw, and a Salute-compatible response is returned.

## Core Decisions

- Salute `Chat App` with `SmartApp API` scenario type
- Standalone `salute` OpenClaw plugin implemented in this repo
- Personal OpenClaw server as the runtime host
- LLM-only fast path for immediate responses + background full-agent runs with tools

## Architecture

```text
User voice/text
  → Salute device
  → Salute Chat App
  → SmartApp API HTTPS POST (7s timeout)
  → Nginx TLS reverse proxy (:443)
  → OpenClaw gateway (127.0.0.1:18789)
  → salute plugin (this repo)
  → OpenClaw runtime (embedded Pi agent)
  → Salute response mapper
  → SmartApp API response
  → Salute voice/screen output
```

## Production Topology

- **Public endpoint:** `https://www.saluteclaw.ru/salute/webhook`
- **Nginx:** TLS termination on `:443` using REG.RU DomainSSL certs, proxies `/salute/webhook` to `127.0.0.1:18789`
- **OpenClaw gateway:** binds to loopback only, port `18789`, plugin loaded from `/root/SaluteClaw/plugin`

### OpenClaw Config (`/root/.openclaw/openclaw.json`)

- `gateway.port`: `18789`
- `gateway.bind`: `loopback`
- `plugins.load.paths`: includes `/root/SaluteClaw/plugin`
- `plugins.entries.salute.enabled`: `true`
- `plugins.allow`: `["salute"]`
- `channels.salute.accounts.default.webhookPath`: `/salute/webhook`

## Plugin Structure

```text
plugin/
  package.json
  openclaw.plugin.json
  tsconfig.json
  index.ts            — plugin entrypoint and registration
  setup-entry.ts      — channel definition export for setup mode
  src/
    channel.ts        — channel definition and OpenClaw registration
    config.ts         — config helpers and account resolution
    webhook.ts        — HTTP route handling, two-phase async orchestration
    inbound.ts        — parse and normalize Salute requests
    outbound.ts       — build Salute response payloads
    mapper.ts         — truncation, sanitization for voice/bubble output
    runtime.ts        — fast LLM handoff + background full-agent runner
    cache.ts          — in-memory TTL cache for background agent results
    types.ts          — shared Salute payload and OpenClaw plugin types
```

## Two-Phase Async Pattern (Tool Calling)

The Salute SmartApp API enforces a **7-second webhook timeout** and offers no server-initiated push mechanism (see investigation below). To support tool-enabled agent runs that exceed this limit, the plugin uses a two-phase async pattern:

### How It Works

1. **Message N arrives** — the plugin responds immediately with a fast LLM-only completion (`disableTools: true`, ~2s). Simultaneously, a full agent run (`disableTools: false`, up to 120s) starts in the background.
2. **Message N+1 arrives** — the plugin checks for a cached background result from message N. If available, it is prepended to the new fast reply. A new background run starts for message N+1.

There is always a **one-message delay** on the richer, tool-enabled answer.

### Cache (`src/cache.ts`)

- In-memory `Map` keyed by `salute:{accountId}:{sessionId}`
- `storePendingRun()` — stores a background promise; on resolve, writes the result into the cache
- `consumeCachedResult()` — atomically reads and removes a cached result
- `evictSession()` — called on `CLOSE_APP` to clean up
- 10-minute TTL with 60-second eviction sweeps
- If a new message arrives while a background run is pending, the new run replaces the old one
- Failed/timed-out background runs are silently dropped

### Runtime Parameters (`src/runtime.ts`)

| Parameter | Fast path | Background path |
|---|---|---|
| `disableTools` | `true` | `false` |
| `bootstrapContextMode` | `lightweight` | `full` |
| `fastMode` | `true` | `false` |
| `timeoutMs` | 12,000 | 120,000 |
| `provider` | `openai-codex` | `openai-codex` |
| `model` | `gpt-5.3-codex-spark` | `gpt-5.3-codex-spark` |
| `authProfileId` | `openai-codex:default` | `openai-codex:default` |

### Available Models (`openai-codex` provider via ChatGPT Pro OAuth)

- `gpt-5.4` — most capable, 5–13s latency (too slow for fast path)
- `gpt-5.3-codex-spark` — **currently used**, ~2s latency
- `gpt-5.3-codex`, `gpt-5.2-codex`, `gpt-5.2`, `gpt-5.1-codex`
- Standard OpenAI API models (`gpt-4.1-mini`, `gpt-4.1-nano`) are not available through this provider (different auth path: `chatgpt.com/backend-api`)

## Salute Push Messaging Investigation

Investigated whether the Salute platform supports server-initiated messages to deliver async results without the one-message delay.

### Findings

1. **SmartPush API** exists (`ngw.devices.sberbank.ru:9443/api/v2/smartpush/apprequest-lite`) but is designed for marketing-style push notifications with pre-moderated templates. Targets users by `clientId` (sub), not `sessionId`. Delivers device-level notifications, not in-app conversational messages. Requires template moderation and `SMART_PUSH` OAuth scope.
2. **SERVER_ACTION** is inbound-only (frontend → backend for user actions like button clicks). Cannot be used server-to-client.
3. **No REST API** exists to send messages to an active session by `sessionId`. The SmartApp API is strictly synchronous webhook with a 7-second timeout.
4. **Conclusion:** push messaging is not supported for delivering async agent results within an active SmartApp session. The two-phase async pattern is the correct approach.

## Plugin Development History

### Request body parsing
The OpenClaw gateway HTTP shape required broad body-parsing support: string/object/Uint8Array bodies, nested wrapped body fields, Node stream bodies (`IncomingMessage` data/end), and optional `req.json()`/`req.text()` forms.

### Runtime handoff
Initial approach used `runtime.subagent.*` which failed with "Plugin runtime subagent methods are only available during a gateway request." Switched to `runtime.agent.runEmbeddedPiAgent(...)`.

### Provider/model alignment
Resolved missing API key errors (`anthropic` provider) and invalid model slug issues (`openai-codex/openai-codex/gpt-5.4`). Forced to `openai-codex` provider with `gpt-5.3-codex-spark`.

### Latency optimization
Full embedded agent loop ran 30–60s per message (tool calls, workspace file reads, commands). Switched to `disableTools: true` + `bootstrapContextMode: "lightweight"` for the fast path, achieving 1.9–2.5s end-to-end latency via public HTTPS webhook.

## Testing

### Curl commands

```bash
# Launch
curl -i -X POST "https://www.saluteclaw.ru/salute/webhook" \
  -H "content-type: application/json" \
  --data @/root/SaluteClaw/fixtures/salute/launch.json

# Message
curl -i -X POST "https://www.saluteclaw.ru/salute/webhook" \
  -H "content-type: application/json" \
  --data @/root/SaluteClaw/fixtures/salute/message.json

# Close
curl -i -X POST "https://www.saluteclaw.ru/salute/webhook" \
  -H "content-type: application/json" \
  --data @/root/SaluteClaw/fixtures/salute/close.json
```

### Plugin inspection

```bash
openclaw plugins inspect salute --json
```

## Known Warnings (Non-fatal)

- Optional memory files missing: `/root/.openclaw/workspace/MEMORY.md`, `/root/.openclaw/workspace/memory/YYYY-MM-DD.md`
- Tool profile warnings about unavailable entries for current runtime/model
- These do not affect Salute webhook operation

## Docs

- `docs/overview.md` — project purpose, scope, and decisions
- `docs/architecture.md` — component design and request flow
- `docs/setup-openclaw.md` — how the personal OpenClaw server loads this plugin
- `docs/setup-salute.md` — how to configure the Salute SmartApp
- `docs/poc-plan.md` — phased delivery plan and fallback path

## References

- OpenClaw plugin docs: https://docs.openclaw.ai/tools/plugin
- Salute Chat App setup: https://developers.sber.ru/docs/ru/va/chat/step-by-step/setup
- Salute SmartApp API: https://developers.sber.ru/docs/ru/va/api/overview
- Salute SmartPush API: https://developers.sber.ru/docs/ru/va/smartservices/smartpush/api/overview
