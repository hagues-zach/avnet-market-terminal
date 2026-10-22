// Claude's cached text predates the no-dash rule and can't be regenerated, so
// dashes are rewritten when it is read: a range becomes "to", any other dash a
// comma. Pure, so every page that quotes cached text shows the same words.

const RANGE = /(\d[\d.,]*\s*(?:%|[BMK]|billion|million)?)\s*[–—]\s*(\$?\d)/g;

export function plainDashes(text: string): string {
  return text
    .replace(RANGE, "$1 to $2")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",");
}

/** Every string in a value, rewritten; other values unchanged. */
export function plainDeep<T>(v: T): T {
  if (typeof v === "string") return plainDashes(v) as T;
  if (Array.isArray(v)) return v.map(plainDeep) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plainDeep(x)])) as T;
  return v;
}
