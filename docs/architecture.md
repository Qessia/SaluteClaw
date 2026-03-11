# SaluteClaw Architecture

## Runtime Model
The implementation lives in this repository, but the runtime host is the existing personal OpenClaw server.

Expected usage:
- point OpenClaw `plugins.load.paths` at this repo's `plugin/` directory, or
- install the local plugin from this repo into the personal server environment

This allows all integration code to stay local to this repo while still using the existing server.

## High-Level Flow
```text
User voice/text
  -> Salute device
  -> Salute Chat App
  -> SmartApp API HTTPS request
  -> personal OpenClaw server
  -> salute plugin from this repo
  -> OpenClaw runtime
  -> Salute response mapper
  -> SmartApp API response
  -> Salute voice/screen output
```

## Core Components
### Salute SmartApp
Responsibilities:
- accept user voice or text input
- send SmartApp API requests to the backend
- render the returned voice and screen response

### OpenClaw Server
Responsibilities:
- host the plugin runtime
- provide the existing OpenClaw execution path
- expose a reachable HTTPS endpoint for Salute traffic

### `salute` Plugin
Responsibilities:
- register a new OpenClaw channel
- expose an inbound webhook route for Salute
- parse SmartApp API payloads
- normalize inbound requests into an OpenClaw-friendly message/session model
- hand off requests to OpenClaw
- map OpenClaw output back into Salute response JSON
- return safe fallback responses on error

## Plugin Structure
Recommended initial shape:

```text
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
```

Suggested file roles:
- `index.ts`: plugin entrypoint and registration
- `channel.ts`: channel definition and OpenClaw registration
- `config.ts`: config helpers and account resolution
- `webhook.ts`: HTTP route handling
- `inbound.ts`: parse and normalize Salute requests
- `outbound.ts`: build Salute response payloads
- `mapper.ts`: convert OpenClaw output into Salute-safe content
- `types.ts`: shared payload and normalized types

## Minimal Channel Shape
Minimum viable behavior:
- plugin id: `salute`
- channel id: `salute`
- register with `api.registerChannel({ plugin })`
- config under `channels.salute.accounts.default`
- one webhook endpoint
- text-only I/O for the first version

Recommended starting config:

```json5
{
  channels: {
    salute: {
      enabled: true,
      accounts: {
        default: {
          enabled: true,
          webhookPath: "/salute/webhook",
          publicBaseUrl: "https://your-public-domain.example"
        }
      }
    }
  },
  plugins: {
    entries: {
      salute: {
        enabled: true
      }
    }
  }
}
```

## Inbound Request Model
The PoC only needs to recognize four categories:
- `launch`
- `message`
- `action`
- `close`

Recommended normalized envelope:

```ts
type SaluteInboundEnvelope = {
  accountId: string;
  sessionId: string;
  userId?: string;
  chatId: string;
  requestType: "launch" | "message" | "action" | "close";
  text?: string;
  actionId?: string;
  rawRequest: unknown;
};
```

The point of normalization is to isolate Salute-specific payload details from the rest of the integration.

## Outbound Response Model
The PoC should return:
- one short spoken answer
- optional display text
- optional simple suggestions if easy to support

Response rules:
- keep output concise
- avoid `null` values
- drop unsupported fields
- return deterministic fallback text on failure

## UX Constraints
The first version should optimize for voice-first behavior:
- prefer short answers
- prefer simple follow-up prompts
- avoid long generated paragraphs
- avoid screen-dependent flows
- avoid assuming streaming responses

If OpenClaw returns a long answer, the mapper should shorten or summarize it before returning it to Salute.

## State Model
For the PoC, keep session state minimal.

Recommended keys:
- `accountId`
- `sessionId`
- `userId` if available
- `chatId`

Advanced session recovery can wait until the first demo works end to end.

## Error Handling
The integration must always return valid SmartApp API JSON.

Minimum fallback cases:
- unsupported request type
- empty user input
- OpenClaw timeout
- invalid OpenClaw response
- internal exception

Expected behavior:
- no raw stack traces
- short retry-safe fallback messages
- valid response shape even when OpenClaw fails

## Security Notes
Baseline requirements for the PoC:
- HTTPS endpoint
- stable public URL
- avoid unnecessary logging of raw user content

Possible future improvements:
- request signature verification
- stricter auth or allowlisting
- stronger secret handling

## Fallback Architecture
If loading the plugin into the personal OpenClaw server proves awkward, use a thin adapter service in this repo:

```text
Salute -> adapter service -> personal OpenClaw server API -> adapter service -> Salute
```

That is not the preferred architecture, but it is an acceptable fallback for a PoC demo.
