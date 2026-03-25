# SaluteClaw Overview

## Purpose
`SaluteClaw` connects a Salute `Chat App` (scenario type `SmartApp API`) to a personal OpenClaw server through a standalone `salute` plugin.

User voice/text is sent to the SmartApp webhook, normalized by the plugin, forwarded to OpenClaw runtime, and mapped back into Salute-compatible JSON for voice and screen output.

## Current Status
The integration is implemented and running in plugin form:

- standalone plugin in `plugin/` loaded by OpenClaw
- webhook endpoint `/salute/webhook`
- inbound support for `RUN_APP`, `MESSAGE_TO_SKILL`, `SERVER_ACTION`, `CLOSE_APP`
- Salute response builders for greeting, answer, goodbye, and error fallbacks
- text sanitization + truncation for voice-first UX
- two-phase async model for tool-enabled responses under Salute timeout limits

## Core Decisions
- Salute side: `Chat App` + `SmartApp API`
- Runtime host: existing personal OpenClaw server (no OpenClaw core changes)
- Plugin model: local `salute` channel plugin loaded from this repo
- Response strategy: fast LLM-only reply immediately, richer tool-enabled result on next turn

## Why Two-Phase Async
Salute SmartApp API webhook handling is synchronous with a strict response window. Tool-enabled OpenClaw runs can exceed that limit.

Current behavior:
1. Incoming message gets an immediate fast reply (`disableTools: true`).
2. In parallel, a background full-agent run starts (`disableTools: false`).
3. On the next user turn, cached background text (if ready) is prepended before the new fast reply.

This introduces a one-message delay for richer, tool-based answers while keeping webhook latency low.

## Repository Responsibilities
This repo contains:

- source for the OpenClaw `salute` plugin
- Salute inbound/outbound mapping logic
- runtime handoff and background result cache
- payload fixtures in `fixtures/salute/`
- setup docs for OpenClaw and Salute Studio

## Plugin Layout
```text
plugin/
  package.json
  openclaw.plugin.json
  index.ts
  setup-entry.ts
  src/
    channel.ts
    config.ts
    webhook.ts
    inbound.ts
    outbound.ts
    mapper.ts
    runtime.ts
    cache.ts
    types.ts
```

## Non-Goals (Current PoC)
- rich media/cards beyond simple text bubble + optional suggestions
- push delivery of async results into the same active session
- catalog/publication hardening
- advanced policy/moderation flows

## References
- OpenClaw plugin docs: https://docs.openclaw.ai/tools/plugin
- Salute Chat App setup: https://developers.sber.ru/docs/ru/va/chat/step-by-step/setup
- Salute SmartApp API overview: https://developers.sber.ru/docs/ru/va/api/overview
- Project spec: `SPEC.md`
