export type NormalizedArray<T> = {
  /** Items coerced to an array when possible. */
  items: T[];
  /** True when the input already matched an expected array shape. */
  isValid: boolean;
};

/**
 * Coerces API responses into a predictable array shape while reporting whether the
 * original payload matched what we expect. Handles common `{ data: [...] }` shapes
 * and returns an empty array when the payload is unusable.
 */
export function normalizeArrayData<T>(value: unknown): NormalizedArray<T> {
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

  return { items: [], isValid: false };
}
