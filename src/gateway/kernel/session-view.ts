import type { AuthResult, ExecutionContext } from "@/gateway/kernel/kernel.types";

/**
 * The Frontend gets one consistent session shape no matter which Kernel
 * endpoint produced it (signup, login, or identity/resolve). Reshaping a
 * response into a stable contract is transport/normalization work, not a
 * business decision - the values themselves come entirely from the
 * Kernel and are never altered here.
 */
export interface SessionView {
  userId: string;
  email: string;
  companyId: string;
  companyName: string;
  role: string;
  permissions: string[];
}

export function fromAuthResult(result: AuthResult): SessionView {
  return {
    userId: result.identity.user_id,
    email: result.identity.email,
    companyId: result.company.id,
    companyName: result.company.name,
    role: result.company.role,
    permissions: result.company.permissions,
  };
}

export function fromExecutionContext(ctx: ExecutionContext): SessionView | null {
  if (!ctx.company.id) return null;
  return {
    userId: ctx.identity.user_id,
    email: ctx.identity.email ?? "",
    companyId: ctx.company.id,
    companyName: ctx.company.name ?? "",
    role: ctx.permissions.role ?? "none",
    permissions: ctx.permissions.grants,
  };
}
