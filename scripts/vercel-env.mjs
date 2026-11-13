/** Validate configuration without logging values or connecting to the database. */
export function validateServerEnvironment(env) {
  const errors = [];
  if (!env.DATABASE_URL) {
    errors.push("DATABASE_URL is missing. Set an externally reachable PostgreSQL URL in Vercel.");
  } else {
    try {
      const url = new URL(env.DATABASE_URL);
      if (!["postgres:", "postgresql:", "postgresql+psycopg:"].includes(url.protocol) || !url.hostname) {
        throw new Error("invalid PostgreSQL URL");
      }
    } catch {
      errors.push("DATABASE_URL is not a valid PostgreSQL connection URL. Check its format in Vercel.");
    }
  }

  // Match the existing backend: a non-empty JWT_SECRET takes precedence.
  const secret = env.JWT_SECRET || env.SESSION_SECRET;
  if (!secret || Array.from(secret).length < 32) {
    errors.push("Set JWT_SECRET or SESSION_SECRET to at least 32 characters in Vercel.");
  }
  return errors;
}
