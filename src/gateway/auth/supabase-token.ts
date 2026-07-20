/**
 * The Gateway does NOT verify Supabase tokens cryptographically - that's
 * the Kernel's job (it owns the Supabase JWT secret, and the resolution
 * of identity into company/permissions is business logic). All the
 * Gateway does is reject obviously-malformed input cheaply, before
 * spending a network hop on the Kernel.
 */
export function looksLikeJwt(token: unknown): token is string {
  return typeof token === "string" && token.split(".").length === 3 && token.length > 20;
}
