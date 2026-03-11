import type { SaluteAccountConfig } from "./types.js";

const CHANNEL_ID = "salute";

export function listAccountIds(cfg: Record<string, unknown>): string[] {
  const channels = cfg.channels as Record<string, unknown> | undefined;
  const salute = channels?.[CHANNEL_ID] as Record<string, unknown> | undefined;
  const accounts = salute?.accounts as Record<string, unknown> | undefined;
  return accounts ? Object.keys(accounts) : [];
}

export function resolveAccount(
  cfg: Record<string, unknown>,
  accountId?: string,
): SaluteAccountConfig & { accountId: string } {
  const id = accountId ?? "default";
  const channels = cfg.channels as Record<string, unknown> | undefined;
  const salute = channels?.[CHANNEL_ID] as Record<string, unknown> | undefined;
  const accounts = salute?.accounts as Record<string, unknown> | undefined;
  const account = (accounts?.[id] ?? {}) as SaluteAccountConfig;
  return { ...account, accountId: id };
}

export function inspectAccount(
  cfg: Record<string, unknown>,
  accountId?: string,
): Record<string, unknown> {
  const acct = resolveAccount(cfg, accountId);
  return {
    enabled: acct.enabled !== false,
    configured: !!acct.webhookPath,
    webhookPath: acct.webhookPath ?? "(not set)",
  };
}
