# Salute Setup

## Goal
Configure a Salute SmartApp that sends SmartApp API webhook requests to the OpenClaw-hosted `salute` plugin.

## 1) Create SmartApp
In Salute Studio:

- project type: `Chat App`
- scenario type: `SmartApp API`
- webhook URL: public HTTPS endpoint for `/salute/webhook`

Example:

```text
https://your-domain.example/salute/webhook
```

## 2) Request/Response Contract
The plugin currently handles inbound message names:

- `RUN_APP`
- `MESSAGE_TO_SKILL`
- `SERVER_ACTION`
- `CLOSE_APP`

The plugin responds with Salute-compatible JSON using:

- `messageName: "ANSWER_TO_USER"`
- `payload.pronounceText`
- `payload.items[].bubble.text`
- optional `payload.suggestions.buttons`
- `auto_listening` and `finished` flags depending on flow stage

## 3) UX Expectations
Current behavior is voice-first and text-focused:

- short spoken answers
- optional bubble text mirror
- optional simple text suggestion buttons
- deterministic greeting, goodbye, and error fallbacks

Text is sanitized and truncated server-side for Salute safety.

## 4) Two-Phase Response Model (Important)
Because SmartApp API webhook handling is synchronous and time-limited:

1. User turn gets a fast immediate answer.
2. A richer tool-enabled agent run starts in background.
3. On the next user turn, cached background result may appear before the new fast answer.

This means richer results can be delayed by one message turn.

## 5) Test Flow
Use fixture payloads in `fixtures/salute/`:

- `launch.json`
- `message.json`
- `action.json`
- `close.json`

Recommended manual checks in Salute:
1. App launch returns greeting and keeps listening.
2. Normal message returns fast answer within platform timeout.
3. Next message can include prior cached richer result.
4. Close request returns goodbye and ends the session.

## 6) Known Platform Constraint
Server-initiated push into the active SmartApp conversation is not available for this use case, so next-turn delivery is the chosen architecture for long-running tool-enabled answers.
