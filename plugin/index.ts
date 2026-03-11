import { saluteChannel } from "./src/channel.js";
import { resolveAccount } from "./src/config.js";
import { createWebhookHandler } from "./src/webhook.js";

interface PluginApi {
  registerChannel: (opts: { plugin: typeof saluteChannel }) => void;
  registerHttpRoute: (opts: {
    path: string;
    auth: string;
    match?: string;
    handler: (req: unknown, res: unknown) => Promise<boolean>;
  }) => void;
  logger: {
    info: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
  config: Record<string, unknown>;
}

export default function register(api: PluginApi) {
  api.registerChannel({ plugin: saluteChannel });

  const accountIds = saluteChannel.config.listAccountIds(api.config);
  for (const accountId of accountIds) {
    const account = resolveAccount(api.config, accountId);
    const webhookPath = account.webhookPath ?? "/salute/webhook";

    const handler = createWebhookHandler(accountId, {
      logger: api.logger,
      // Phase 4 will wire this to the real OpenClaw runtime.
      // For now the webhook returns an echo/stub response.
      handleMessage: undefined,
    });

    api.registerHttpRoute({
      path: webhookPath,
      auth: "plugin",
      match: "exact",
      handler: handler as (req: unknown, res: unknown) => Promise<boolean>,
    });

    api.logger.info(
      `[salute] registered webhook for account "${accountId}" at ${webhookPath}`,
    );
  }
}
