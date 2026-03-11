# PoC Plan

## Objective
Reach a working end-to-end demo where a Salute SmartApp sends a user request to the personal OpenClaw server and receives a valid reply generated through the `salute` integration in this repository.

## Phase 1. Documentation And Fixtures
Tasks:
- capture the basic Salute request and response shapes
- define the minimal plugin structure
- add sample JSON fixtures for launch, message, action, and close

Success criteria:
- the repo contains stable design notes and payload examples

## Phase 2. Plugin Skeleton
Tasks:
- create `plugin/`
- add `package.json`
- add `openclaw.plugin.json`
- add `index.ts`
- register the `salute` channel
- expose a stub webhook route

Success criteria:
- the personal OpenClaw server can load the plugin from this repo

## Phase 3. Salute Request Mapping
Tasks:
- parse launch, message, action, and close payloads
- normalize requests into a local envelope
- return hardcoded but valid Salute responses

Success criteria:
- Salute can reach the webhook and get a valid answer

## Phase 4. OpenClaw Handoff
Tasks:
- connect normalized requests to the personal OpenClaw runtime
- map the OpenClaw reply back into Salute response JSON
- add output shortening rules for voice-first responses

Success criteria:
- a real user question in Salute returns a real OpenClaw answer

## Phase 5. Demo Hardening
Tasks:
- improve fallback behavior
- handle timeouts safely
- document local setup steps
- refine response formatting

Success criteria:
- the PoC is repeatable and understandable from repo docs

## Fallback Plan
If the plugin-loading route turns out too awkward, use a thin adapter service in this repo:

```text
Salute -> adapter service -> personal OpenClaw server API -> adapter service -> Salute
```

This is acceptable for the PoC because it still proves the user experience quickly.

## Key Open Questions
1. What is the easiest plugin-loading workflow for the personal OpenClaw server?
2. What public HTTPS endpoint will Salute use?
3. Which OpenClaw runtime surface should the plugin call for inbound messages?
4. Do we want suggestion buttons in the first demo, or only text?
