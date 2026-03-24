# SaluteClaw Agent Notes

## Goal And Outcome
- Goal: build and debug a Salute SmartApp -> OpenClaw `salute` plugin integration.
- Outcome: webhook path is live over HTTPS and returns valid Salute responses for launch/message/close flows.
- Public webhook (correct): `https://www.saluteclaw.ru/salute/webhook`
- Important typo to avoid: do not use trailing-dot host (`www.saluteclaw.ru.`).

## Production Topology
- Salute Studio (SmartApp API) -> `https://www.saluteclaw.ru/salute/webhook`
- Nginx TLS reverse proxy on `:443`
- Proxy target: `http://127.0.0.1:18789/salute/webhook`
- OpenClaw gateway runs local-only (`bind: loopback`) with plugin loaded from `/root/SaluteClaw/plugin`.

## Key Configs
### OpenClaw (`/root/.openclaw/openclaw.json`)
- `gateway.port`: `18789`
- `gateway.bind`: `loopback`
- `plugins.load.paths`: includes `/root/SaluteClaw/plugin`
- `plugins.entries.salute.enabled`: `true`
- `channels.salute.accounts.default.webhookPath`: `/salute/webhook`
- `plugins.allow`: `["salute"]` (already set)

### Nginx
- HTTPS is terminated by Nginx using REG.RU DomainSSL cert files.
- Route `/salute/webhook` is proxied to local OpenClaw gateway on `127.0.0.1:18789`.

## What Was Fixed In Plugin
### 1) Request body parsing for gateway HTTP shape
- `plugin/src/webhook.ts` now supports:
  - string/object/Uint8Array bodies
  - nested wrapped body fields
  - Node stream body (`IncomingMessage` data/end)
  - optional `req.json()` / `req.text()` forms
- This fixed repeated `400 {"error":"bad request"}` during early tests.

### 2) Runtime handoff surface
- Initial approach used `runtime.subagent.*` in webhook path and failed with:
  - `Plugin runtime subagent methods are only available during a gateway request.`
- Handoff was switched to:
  - `runtime.agent.runEmbeddedPiAgent(...)`

### 3) Provider/model/auth alignment
- Errors observed and resolved:
  - missing anthropic key (`No API key found for provider "anthropic"`)
  - invalid model slug (`openai-codex/openai-codex/gpt-5.4`)
- Forced runtime handoff to:
  - provider: `openai-codex`
  - model: `gpt-5.3-codex-spark` (fast enough for Salute VPS timeout)
  - auth profile: `openai-codex:default`

### 4) Timeout and result extraction
- Webhook timeout reduced to 15 s (was 120 s) to match Salute platform constraints.
- Added extraction from embedded-agent result payloads (`payloads[*].text`, etc.).

### 5) Session key scope
- Session key is now aligned to Salute `sessionId` (instead of long user/chat compound).
- This reduced context growth issues and avoided prompt cache key length edge cases.

### 6) LLM-only mode (disableTools) — critical for Salute latency
- The full embedded agent loop ran 30-60 s per message (tool calls: session_status,
  reading workspace files, exec commands) — far exceeding Salute's ~5-10 s deadline.
- `runtime.ts` now passes `disableTools: true` and `bootstrapContextMode: "lightweight"`
  to `runEmbeddedPiAgent`, eliminating all tool calls and heavy context injection.
- Added `extraSystemPrompt` with concise SaluteClaw persona (brief Russian responses).
- Model switched from `gpt-5.4` to `gpt-5.3-codex-spark` for consistent ~2 s responses.
- Measured latency: 1.9–2.5 s end-to-end (via public HTTPS webhook).

### 7) Observability
- Error logs now include detailed exception text/stack in-line:
  - `[salute] handler error: ...`

## Current Runtime Parameters (`plugin/src/runtime.ts`)
- `HANDOFF_TIMEOUT_MS`: `12_000` (12 s)
- `DEFAULT_PROVIDER`: `openai-codex`
- `DEFAULT_MODEL`: `gpt-5.3-codex-spark`
- `DEFAULT_AUTH_PROFILE`: `openai-codex:default`
- `disableTools`: `true` (LLM-only, no tool calls)
- `bootstrapContextMode`: `lightweight`
- `extraSystemPrompt`: concise SaluteClaw persona (Russian, 1–3 sentences)

## Available Models (`openai-codex` provider)
Only these models work through the `openai-codex` (ChatGPT Pro OAuth) provider:
- `gpt-5.4` — most capable, 5–13 s latency (too slow for Salute)
- `gpt-5.3-codex-spark` — **currently used**, ~2 s latency
- `gpt-5.3-codex`, `gpt-5.2-codex`, `gpt-5.2`, `gpt-5.1-codex`
- Standard OpenAI API models (`gpt-4.1-mini`, `gpt-4.1-nano`) are NOT available
  through this provider (different auth path: `chatgpt.com/backend-api`).

## Files Added/Changed During Work
- Added:
  - `plugin/tsconfig.json`
  - `plugin/setup-entry.ts`
  - `plugin/src/runtime.ts`
- Updated:
  - `plugin/index.ts`
  - `plugin/package.json`
  - `plugin/src/types.ts` (added `disableTools`, `bootstrapContextMode`, `extraSystemPrompt` to `PluginRuntime`)
  - `plugin/src/webhook.ts` (timeout 120 s → 15 s)

## Verified Test Commands
### Public endpoint
```bash
curl -i -X POST "https://www.saluteclaw.ru/salute/webhook" \
  -H "content-type: application/json" \
  --data @/root/SaluteClaw/fixtures/salute/launch.json
```

```bash
curl -i -X POST "https://www.saluteclaw.ru/salute/webhook" \
  -H "content-type: application/json" \
  --data @/root/SaluteClaw/fixtures/salute/message.json
```

```bash
curl -i -X POST "https://www.saluteclaw.ru/salute/webhook" \
  -H "content-type: application/json" \
  --data @/root/SaluteClaw/fixtures/salute/close.json
```

### Plugin state
```bash
openclaw plugins inspect salute --json
```

## Current Known Warnings (Non-fatal)
- Optional memory files missing:
  - `/root/.openclaw/workspace/MEMORY.md`
  - `/root/.openclaw/workspace/memory/YYYY-MM-DD.md`
- Tool profile warning about unavailable entries for current runtime/model.
- These do not block Salute webhook operation.

## Suggested Next Steps
- Test from Salute Studio to confirm end-to-end under real VPS conditions.
- Optionally create placeholder memory files to silence ENOENT warnings.
- Keep webhook URL in Studio exactly:
  - `https://www.saluteclaw.ru/salute/webhook`
- Run periodic smoke tests with launch/message/close fixtures after config changes.
- If richer agent capabilities are needed later, consider returning to full agent mode
  with streaming and returning partial responses to Salute.

