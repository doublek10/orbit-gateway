import { env } from "@/gateway/config/env";
import { translateKernelError } from "@/gateway/kernel/kernel.errors";
import type {
  AuthResult,
  CountryOut,
  ExecuteRequest,
  ExecutionContext,
  LoginRequest,
  SessionOut,
  SignupRequest,
} from "@/gateway/kernel/kernel.types";

/**
 * Kernel Client
 *
 * The Gateway's ONLY door to the Kernel (Development Rule #5). Every
 * single request the Frontend makes - auth or otherwise - ends up as one
 * call through this file. The Gateway does not cache, sign, or interpret
 * anything the Kernel returns; it just relays it.
 */
class KernelClient {
  private async post<T>(path: string, body: unknown): Promise<T> {
    let res: Response;

    try {
      const url = `${env.kernelUrl}${path}`;

      console.log("========== KERNEL REQUEST ==========");
      console.log("Method:", "POST");
      console.log("URL:", url);

      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gateway-Secret": env.gatewaySharedSecret,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      console.log("Kernel Response Status:", res.status);
    } catch (err) {
      console.error("========== KERNEL FETCH FAILED ==========");
      console.error("Kernel URL:", `${env.kernelUrl}${path}`);
      console.error("Error:", err);

      if (err instanceof Error) {
        console.error("Message:", err.message);
        console.error("Stack:", err.stack);
      }

      throw err;
    }

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("========== KERNEL ERROR RESPONSE ==========");
      console.error("Status:", res.status);
      console.error("Payload:", payload);

      throw translateKernelError(res.status, payload);
    }

    return payload as T;
  }

  private async get<T>(path: string): Promise<T> {
    let res: Response;

    try {
      const url = `${env.kernelUrl}${path}`;

      console.log("========== KERNEL REQUEST ==========");
      console.log("Method:", "GET");
      console.log("URL:", url);

      res = await fetch(url, {
        cache: "no-store",
        headers: {
          "X-Gateway-Secret": env.gatewaySharedSecret,
        },
      });

      console.log("Kernel Response Status:", res.status);
    } catch (err) {
      console.error("========== KERNEL FETCH FAILED ==========");
      console.error("Kernel URL:", `${env.kernelUrl}${path}`);
      console.error("Error:", err);

      if (err instanceof Error) {
        console.error("Message:", err.message);
        console.error("Stack:", err.stack);
      }

      throw err;
    }

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("========== KERNEL ERROR RESPONSE ==========");
      console.error("Status:", res.status);
      console.error("Payload:", payload);

      throw translateKernelError(res.status, payload);
    }

    return payload as T;
  }

  // --- Auth bootstrapping: the Kernel talks to Supabase here, nowhere else ---

  async signup(input: SignupRequest): Promise<AuthResult> {
    return this.post<AuthResult>("/kernel/v1/auth/signup", input);
  }

  async login(input: LoginRequest): Promise<AuthResult> {
    return this.post<AuthResult>("/kernel/v1/auth/login", input);
  }

  async refresh(refreshToken: string): Promise<SessionOut> {
    return this.post<SessionOut>("/kernel/v1/auth/refresh", {
      refresh_token: refreshToken,
    });
  }

  async logout(accessToken: string): Promise<{ ok: boolean }> {
    return this.post<{ ok: boolean }>("/kernel/v1/auth/logout", {
      access_token: accessToken,
    });
  }

  // --- Every other authenticated request goes through these two ---

  async resolveIdentity(
    accessToken: string,
    companyId?: string
  ): Promise<ExecutionContext> {
    return this.post<ExecutionContext>("/kernel/v1/identity/resolve", {
      supabase_access_token: accessToken,
      company_id: companyId,
    });
  }

  async execute<T>(req: ExecuteRequest): Promise<T> {
    return this.post<T>("/kernel/v1/execute", req);
  }

  async health(): Promise<{ status: string; database: boolean }> {
    const res = await fetch(`${env.kernelUrl}/kernel/v1/health`, {
      cache: "no-store",
      headers: {
        "X-Gateway-Secret": env.gatewaySharedSecret,
      },
    });

    return res.json();
  }

  // --- Country Packages: public, unauthenticated - the Frontend needs
  // this before a session exists, to render the registration form's
  // country picker (spec: "Frontend ... Retrieves available countries
  // from the Kernel"). ---

  async countries(): Promise<CountryOut[]> {
    return this.get<CountryOut[]>("/kernel/v1/countries");
  }
}

export const kernelClient = new KernelClient();
