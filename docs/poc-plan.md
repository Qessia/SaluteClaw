# PoC Plan

## Objective
Maintain and harden the already working Salute <-> OpenClaw integration while preserving low-latency SmartApp responses.

## Current Completion Snapshot
Completed:

- plugin scaffolding and registration (`index.ts`, `setup-entry.ts`, channel metadata)
- webhook route handling per account
- inbound parsing for `RUN_APP`, `MESSAGE_TO_SKILL`, `SERVER_ACTION`, `CLOSE_APP`
- outbound response builders (greeting/answer/goodbye/error)
- OpenClaw runtime handoff via embedded Pi agent
- two-phase async orchestration (fast immediate + background full-agent)
- session result cache with TTL and close-session eviction
- fixture payloads for launch/message/action/close
- Nginx -> OpenClaw webhook topology documented in `SPEC.md`

## Phase A - Reliability Hardening (Next)
Tasks:

- add structured observability around fast-path latency and background completion rates
- classify runtime failures (timeout/tool/provider/output-shape) with counters
- tighten fallback text selection when runtime returns partial/empty payloads
- verify behavior under concurrent turns in the same session

Success criteria:
- stable behavior under repeated multi-turn conversations with predictable fallback quality

## Phase B - Response Quality Tuning
Tasks:

- tune prompt and truncation strategy for voice-first naturalness
- validate suggestion button usage for common follow-ups
- ensure mixed-language and punctuation-heavy requests remain clean after sanitization

Success criteria:
- concise, understandable spoken responses with minimal awkward truncation artifacts

## Phase C - Ops and Repeatability
Tasks:

- document restart/deploy loop for plugin updates
- capture known non-fatal warnings and operator actions
- keep setup docs synced with actual `openclaw.json` shape and plugin behavior

Success criteria:
- a new operator can reproduce setup and smoke tests from docs alone

## Phase D - Optional Enhancements
Tasks:

- evaluate multi-account Salute routing patterns
- consider response metadata fields only if supported and useful
- re-check platform capabilities for async delivery alternatives if APIs evolve

Success criteria:
- optional features do not regress baseline webhook latency/reliability

## Out of Scope for Current PoC
- replacing plugin architecture with separate adapter service
- rich media card flows as primary interaction mode
- catalog publication/compliance packaging
