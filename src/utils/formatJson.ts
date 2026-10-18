/**
 * Pretty-print a JSON column for display. The API returns JSONB columns (event type schema and
 * examplePayload, message payload) already decoded, so they are usually objects; older rows may
 * hold a JSON string. Returns null for null/undefined.
 */
export function formatJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
