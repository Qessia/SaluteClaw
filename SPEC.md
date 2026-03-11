# SaluteClaw Spec

## Goal
Build a proof of concept in this repository that connects a Salute SmartApp to an existing personal OpenClaw server.

The PoC should let a user launch the SmartApp, send a request by voice or text, forward that request into OpenClaw, and return a Salute-compatible response.

## Core Decision
Use:
- a Salute `Chat App`
- `SmartApp API`
- a standalone `salute` OpenClaw plugin implemented in this repo
- the personal OpenClaw server as the runtime host

## PoC Scope
The first version only needs to prove:

1. Salute can reach the webhook.
2. The plugin can parse inbound Salute requests.
3. The plugin can hand off a user message to OpenClaw.
4. The plugin can return a valid Salute response.

## Non-Goals
Not required for the first milestone:
- production deployment polish
- upstream contribution readiness
- rich cards/media
- advanced onboarding
- multi-account support beyond `default`

## Architecture Summary
```text
Salute device
  -> Salute Chat App
  -> SmartApp API webhook
  -> personal OpenClaw server
  -> salute plugin from this repo
  -> OpenClaw runtime
  -> Salute response mapper
  -> Salute response
```

## Docs Map
- `docs/overview.md`: project purpose, scope, and decisions
- `docs/architecture.md`: component design and request flow
- `docs/setup-openclaw.md`: how the personal OpenClaw server should load this plugin
- `docs/setup-salute.md`: how to configure the Salute SmartApp
- `docs/poc-plan.md`: phased delivery plan and fallback path

## Immediate Next Step
Implement the project in this repo as a local plugin that your personal OpenClaw server can load.

## References
- OpenClaw plugin docs: https://docs.openclaw.ai/tools/plugin
- Salute Chat App setup: https://developers.sber.ru/docs/ru/va/chat/step-by-step/setup
- Salute Code overview: https://developers.sber.ru/docs/ru/va/code/overview
