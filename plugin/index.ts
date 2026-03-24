import type { PluginApi } from "./src/types.js";
import { saluteChannel } from "./src/channel.js";
import { resolveAccount } from "./src/config.js";
import { createWebhookHandler } from "./src/webhook.js";
import { setRuntime, handleMessage } from "./src/runtime.js";

export default function register(api: PluginApi) {
  api.registerChannel({ plugin: saluteChannel });

  if (api.runtime) {
    setRuntime(api.runtime);
  }

  const isFullMode = !api.registrationMode || api.registrationMode === "full";
  if (!isFullMode) return;

  const accountIds = saluteChannel.config.listAccountIds(api.config);

  if (accountIds.length === 0) {
    api.logger.warn(
      "[salute] no accounts configured — add channels.salute.accounts.default to config",
    );
  }

  for (const accountId of accountIds) {
    const account = resolveAccount(api.config, accountId);
    if (account.enabled === false) {
      api.logger.info(`[salute] account "${accountId}" is disabled, skipping`);
      continue;
    }

    const webhookPath = account.webhookPath ?? "/salute/webhook";

    const handler = createWebhookHandler(accountId, {
      logger: api.logger,
      handleMessage: api.runtime ? handleMessage : undefined,
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
