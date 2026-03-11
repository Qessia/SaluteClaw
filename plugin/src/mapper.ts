const MAX_PRONOUNCE_LENGTH = 1024;
const MAX_BUBBLE_LENGTH = 2048;

export function truncateForVoice(text: string): string {
  if (text.length <= MAX_PRONOUNCE_LENGTH) return text;

  const cut = text.slice(0, MAX_PRONOUNCE_LENGTH);
  const lastSentence = cut.lastIndexOf(".");
  if (lastSentence > MAX_PRONOUNCE_LENGTH * 0.5) {
    return cut.slice(0, lastSentence + 1);
  }
  return cut + "…";
}

export function truncateForBubble(text: string): string {
  if (text.length <= MAX_BUBBLE_LENGTH) return text;
  return text.slice(0, MAX_BUBBLE_LENGTH) + "…";
}

export function stripNulls<T>(obj: T): T {
  if (obj === null || obj === undefined) return "" as unknown as T;
  if (Array.isArray(obj)) return obj.map(stripNulls) as unknown as T;
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v !== null && v !== undefined) {
        out[k] = stripNulls(v);
      }
    }
    return out as T;
  }
  return obj;
}

export function sanitizeText(text: string): string {
  return text.replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim();
}
