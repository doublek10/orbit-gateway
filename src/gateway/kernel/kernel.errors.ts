/**
 * Standardized error shape for anything that goes wrong talking to the
 * Kernel, so the Gateway can translate it into a consistent HTTP error
 * for clients (Development Rule #8: "All errors must be standardized
 * before returning to clients").
 */

export class KernelError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "KernelError";
    this.status = status;
    this.code = code;
  }
}

export function translateKernelError(status: number, body: unknown): KernelError {
  const detail =
    typeof body === "object" && body !== null && "detail" in body
      ? String((body as { detail: unknown }).detail)
      : "Unexpected Kernel error";

  switch (status) {
    case 400:
      return new KernelError(400, "BAD_INPUT", detail);
    case 401:
      return new KernelError(401, "UNAUTHENTICATED", detail);
    case 403:
      return new KernelError(403, "FORBIDDEN", detail);
    case 409:
      return new KernelError(409, "AMBIGUOUS_COMPANY", detail);
    case 404:
      return new KernelError(404, "NOT_FOUND", detail);
    case 422:
      return new KernelError(422, "VALIDATION_ERROR", detail);
    case 501:
      return new KernelError(501, "NOT_IMPLEMENTED", detail);
    default:
      return new KernelError(502, "KERNEL_UNAVAILABLE", detail);
  }
}
