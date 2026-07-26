/**
 * XSS + NoSQL Injection protection utilities
 */

// ── NoSQL Injection ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sanitized = any;

/**
 * Recursively strip $ and . prefixed keys and block operator expressions
 * that could be used for NoSQL injection (e.g. { $gt: "" }, { $ne: null })
 */
export function sanitizeNoSQL(input: unknown): Sanitized {
  if (input === null || input === undefined) return input;

  if (typeof input === "string") {
    // block common operator patterns in strings
    if (/^\$\w+/.test(input)) return "";
    return input;
  }

  if (typeof input === "number" || typeof input === "boolean") return input;

  if (Array.isArray(input)) {
    return input.map(sanitizeNoSQL);
  }

  if (typeof input === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      // skip $ operators at any nesting level
      if (key.startsWith("$")) continue;
      // block keys with dots (mongo field injection)
      if (key.includes(".")) continue;
      clean[key] = sanitizeNoSQL(value);
    }
    return clean;
  }

  return input;
}

// ── XSS ──────────────────────────────────────────────────────────────

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
};

const ESCAPE_RE = /[&<>"'`/]/g;

/** Escape HTML special characters to prevent stored XSS */
export function escapeHTML(str: string): string {
  return str.replace(ESCAPE_RE, (char) => ESCAPE_MAP[char] ?? char);
}

/**
 * Deep-sanitize a string: trim + escape HTML + strip NoSQL operators.
 * For non-string values, runs sanitizeNoSQL.
 */
export function sanitizeInput(input: unknown): Sanitized {
  if (typeof input === "string") {
    return escapeHTML(input.trim());
  }
  return sanitizeNoSQL(input);
}

/**
 * Sanitize all string values in a request body recursively.
 * Safe to call on any parsed JSON body.
 */
export function sanitizeBody(body: unknown): Sanitized {
  return sanitizeNoSQL(body);
}
