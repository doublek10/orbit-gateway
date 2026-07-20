export interface CountryOut {
  code: string;
  name: string;
  currency: string;
  active: boolean;
}

export interface SessionOut {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface IdentityOut {
  user_id: string;
  email: string;
}

export interface CompanyOut {
  id: string;
  name: string;
  country: string;
  role: string;
  permissions: string[];
}

export interface AuthResult {
  identity: IdentityOut;
  company: CompanyOut;
  session: SessionOut;
}

export interface SignupRequest {
  email: string;
  password: string;
  company_name: string;
  full_name?: string;
  country?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  company_id?: string;
}

export interface ExecutionContext {
  identity: { user_id: string; email: string | null };
  company: { id: string | null; name: string | null; country: string | null };
  permissions: { role: string | null; grants: string[] };
  request_id: string | null;
  metadata: Record<string, unknown>;
}

export interface ExecuteRequest {
  workflow: string;
  payload?: unknown;
  supabase_access_token: string;
  company_id?: string;
  request_id?: string;
}
