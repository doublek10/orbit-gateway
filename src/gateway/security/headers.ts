/**
 * Security headers applied to every Gateway response. Kept centralised so
 * a single audit covers the whole API surface.
 */
export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};
