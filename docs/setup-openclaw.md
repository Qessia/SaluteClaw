# OpenClaw Setup

## Goal
Run the `salute` plugin from this repository on a personal OpenClaw server and expose a reachable Salute webhook.

## 1) Plugin Files
Expected plugin entry files:

```text
plugin/
  package.json
  openclaw.plugin.json
  index.ts
  setup-entry.ts
```

Main runtime modules live under `plugin/src/`.

## 2) OpenClaw Config
Add/verify the following in `~/.openclaw/openclaw.json`:

```json5
{
  gateway: {
    port: 18789,
    bind: "loopback"
  },
  plugins: {
    enabled: true,
    allow: ["salute"],
    load: {
      paths: ["/root/SaluteClaw/plugin"]
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
          webhookPath: "/salute/webhook"
        }
      }
    }
  }
}
```

Notes:
- `channels.salute.accounts.<id>.webhookPath` defaults to `/salute/webhook` if omitted.
- Multiple accounts are supported; one webhook route is registered per account.

## 3) HTTPS Exposure
Salute requires a public HTTPS endpoint.

Recommended topology:
- Nginx terminates TLS on `:443`
- Nginx proxies `/salute/webhook` to `127.0.0.1:18789`
- OpenClaw gateway stays loopback-bound

Example public route:

```text
https://your-domain.example/salute/webhook
```

## 4) Runtime Behavior to Expect
After startup, the plugin should:

- register channel `salute`
- register HTTP route(s) for configured account webhook paths
- parse SmartApp requests and normalize them to envelope form
- return immediate fast replies and queue background tool-enabled runs

## 5) Validation
Useful checks:

1. Plugin inspection:
   ```bash
   openclaw plugins inspect salute --json
   ```
2. Webhook path responds with valid JSON for fixture payloads.
3. `RUN_APP` returns greeting, `CLOSE_APP` returns goodbye.
4. Consecutive messages show two-phase behavior (cached richer output appears on next turn when ready).

## 6) Operational Notes
- Restart OpenClaw after plugin source changes.
- Keep secrets/tokens out of docs and VCS.
- Non-fatal warnings about optional memory files can appear and do not block webhook handling.
