# OpenClaw Setup Notes

## Goal
Load the `salute` plugin from this repository into the existing personal OpenClaw server.

## Preferred Approach
Use a local plugin path during development so the server loads code directly from this repo.

Expected options:
- add this repo's `plugin/` directory to `plugins.load.paths`, or
- install/link the local plugin into the personal OpenClaw environment

The exact method depends on how the personal OpenClaw server is currently configured.

## Expected Plugin Location
The implementation should live in:

```text
plugin/
  package.json
  openclaw.plugin.json
  index.ts
```

## Expected Config Shape
Minimal runtime config target:

```json5
{
  plugins: {
    enabled: true,
    load: {
      paths: ["/absolute/path/to/SaluteClaw/plugin"]
    },
    entries: {
      salute: {
        enabled: true
      }
    }
  },
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
  }
}
```

## Runtime Expectations
Once the plugin exists, the personal OpenClaw server should:
- discover the plugin
- load the `salute` channel
- expose the configured webhook route
- hand inbound Salute requests into the plugin runtime

## Development Notes
For the PoC, manual restarts are acceptable after plugin changes.

Keep the first version simple:
- one default account
- one webhook path
- text-only responses
- no advanced onboarding

## Validation Checklist
The setup is good enough for PoC work when:

1. OpenClaw starts without plugin load errors.
2. The `salute` plugin appears as enabled.
3. The webhook route is reachable.
4. A test request returns a valid JSON response.

## Open Questions
These still need to be confirmed against the personal server:

1. Which local plugin loading workflow is simplest there?
2. Does the server already sit behind a public HTTPS domain?
3. Is a reverse proxy already in place for custom webhook routes?
