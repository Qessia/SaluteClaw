# SaluteClaw Overview

## Purpose
`SaluteClaw` is a proof of concept that connects a Salute SmartApp to an existing personal OpenClaw server.

The project goal is to let a user speak or type through Salute, send that request to OpenClaw, and return a Salute-compatible response.

## Current Assumptions
- The personal OpenClaw server already exists.
- The OpenClaw server can be configured manually.
- The Salute side will use a `Chat App` with `SmartApp API`.
- This repository should contain all code and docs for the PoC integration.
- Manual setup is acceptable for the first milestone.

## Main Decision
Implement a standalone OpenClaw plugin in this repository, then load it into the personal OpenClaw server.

This keeps the project self-contained and avoids modifying OpenClaw core for the first milestone.

## Why `SmartApp API`
`SmartApp API` is the shortest path to a working integration because:
- Salute can call an external HTTPS webhook directly.
- OpenClaw remains the main orchestration runtime.
- The Salute-specific layer stays thin and adapter-focused.
- We avoid re-implementing assistant logic in Salute `Code`.

`Code` is still a future option, but it is not the preferred PoC path.

## Scope
The PoC only needs to prove:

1. Salute can send a request to the integration.
2. The integration can normalize the request for OpenClaw.
3. OpenClaw can generate an answer.
4. The integration can convert that answer into valid Salute response JSON.

## Non-Goals
The first version does not need:
- production deployment polish
- catalog publication readiness
- advanced moderation policy
- multi-account support beyond `default`
- media or rich cards
- upstream contribution readiness

## Repository Responsibilities
This repo should contain:
- the OpenClaw `salute` plugin source
- SmartApp request and response mapping logic
- configuration examples
- fixtures for Salute payloads
- setup notes for OpenClaw
- setup notes for Salute Studio

## Proposed Repository Shape
```text
.
  README.md
  SPEC.md
  docs/
    overview.md
    architecture.md
    setup-openclaw.md
    setup-salute.md
    poc-plan.md
  plugin/
    package.json
    openclaw.plugin.json
    index.ts
    src/
      channel.ts
      config.ts
      webhook.ts
      inbound.ts
      outbound.ts
      mapper.ts
      types.ts
  fixtures/
    salute/
      launch.json
      message.json
      action.json
      close.json
```

## Current Recommendation
Build a narrow text-first bridge first:

1. standalone `salute` plugin in this repo
2. loaded by the personal OpenClaw server
3. Salute `Chat App` using `SmartApp API`
4. short text and voice-safe responses

That is the fastest route to an end-to-end demo.

## References
- OpenClaw plugin docs: https://docs.openclaw.ai/tools/plugin
- Salute Chat App setup: https://developers.sber.ru/docs/ru/va/chat/step-by-step/setup
- Salute Code overview: https://developers.sber.ru/docs/ru/va/code/overview
