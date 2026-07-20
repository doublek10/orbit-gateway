/**
 * Structured request logging (stub). Development Rule #7: "All requests
 * must be logged." Swap console.log for a real sink (pino -> your log
 * aggregator) before production.
 */
export function logRequest(entry: {
  method: string;
  path: string;
  status: number;
  userId?: string;
  companyId?: string;
  durationMs: number;
}): void {
  console.log(JSON.stringify({ at: new Date().toISOString(), ...entry }));
}
