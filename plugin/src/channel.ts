import { listAccountIds, resolveAccount, inspectAccount } from "./config.js";

export const saluteChannel = {
  id: "salute",

  meta: {
    id: "salute",
    label: "Salute",
    selectionLabel: "Salute (SmartApp API)",
    docsPath: "/channels/salute",
    blurb: "Salute voice assistant channel via SmartApp API.",
    aliases: ["salute"],
  },

  capabilities: {
    chatTypes: ["direct" as const],
  },

  config: {
    listAccountIds: (cfg: Record<string, unknown>) => listAccountIds(cfg),
    resolveAccount: (cfg: Record<string, unknown>, accountId?: string) =>
      resolveAccount(cfg, accountId),
    inspectAccount: (cfg: Record<string, unknown>, accountId?: string) =>
      inspectAccount(cfg, accountId),
  },

  outbound: {
    deliveryMode: "direct" as const,
    sendText: async () => ({ ok: true }),
  },
};
