# Salute Setup Notes

## Goal
Create a Salute SmartApp that can send requests to the backend hosted by the personal OpenClaw server.

## Recommended Project Type
Use a Salute `Chat App` with scenario type `SmartApp API`.

This is the preferred PoC path because the SmartApp can forward requests directly to an external HTTPS backend.

## Minimum Studio Setup
Create a project and fill at least:
- SmartApp name
- scenario type: `SmartApp API`
- external HTTPS URL
- short description
- full description if required
- launch examples
- testing instructions

Some catalog-oriented fields may still be required by Studio even for a test project.

## External URL
The external URL should point to the public webhook served by the personal OpenClaw server or its reverse proxy.

Expected example:

```text
https://your-public-domain.example/salute/webhook
```

If Salute requires a dedicated domain shape, use a dedicated subdomain and route it internally to the plugin webhook.

## PoC Interaction Model
The first version should support:
- app launch
- one user message
- a returned text answer
- simple follow-up turns if they work naturally

The first version should avoid:
- complex cards
- media payloads
- long answers
- flows that require a screen

## SmartApp Testing Goals
The Salute side is good enough for the PoC when:

1. The SmartApp launches successfully.
2. Salute can send a request to the configured backend URL.
3. The backend response renders as valid output.
4. A user can complete one simple question-and-answer turn.

## Payload Fixtures
As implementation progresses, capture example payloads for:
- launch
- message
- action
- close

These should be stored in `fixtures/salute/` for local testing and mapping validation.

## Open Questions
Still to confirm during implementation:

1. Which Salute request fields are stable enough to use as session identifiers?
2. What exact response shape is needed for the best voice-first result?
3. Whether suggestion buttons are worth including in the first demo
