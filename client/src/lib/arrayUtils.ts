export type NormalizedArray<T> = {
  /** Items coerced to an array when possible. */
  items: T[];
  /** True when the input already matched an expected array shape. */
  isValid: boolean;
  /** Optional description of why validation failed. */
  reason?: string;
};

/**
 * Coerces API responses into a predictable array shape while reporting whether the
 * original payload matched what we expect. Handles common `{ data: [...] }` shapes
 * and returns an empty array when the payload is unusable.
 */
export function normalizeArrayData<T>(value: unknown, context?: string): NormalizedArray<T> {
  if (Array.isArray(value)) {
    return { items: value, isValid: true };
  }

  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return { items: (value as { data: T[] }).data, isValid: true };
  }

  const description = value === null ? "null" : typeof value;
  const preview = typeof value === "object"
    ? JSON.stringify(value).slice(0, 200)
    : String(value ?? "").slice(0, 200);

  if (context) {
    // eslint-disable-next-line no-console
    console.error(`[data] Unexpected payload for ${context}: expected array, got ${description}`, preview);
  }

  return { items: [], isValid: false, reason: description };
}
