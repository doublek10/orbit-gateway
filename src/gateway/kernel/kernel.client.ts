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
    const url = `${env.kernelUrl}${path}`;

    console.log("========== KERNEL REQUEST ==========");
    console.log("URL:", url);
    console.log("Method: POST");
    console.log("Body:", JSON.stringify(body, null, 2));

    let res: Response;

    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gateway-Secret": env.gatewaySharedSecret,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch (err) {
      console.error("========== FETCH FAILED ==========");
      console.error(err);

      if (err instanceof Error) {
        console.error(err.stack);
        throw new Error(err.stack || err.message);
      }

      throw err;
    }

    console.log("========== KERNEL RESPONSE ==========");
    console.log("Status:", res.status);
    console.log("Status Text:", res.statusText);

    const responseText = await res.text();

    console.log("Raw Response:");
    console.log(responseText);

    let payload: unknown = {};

    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch (err) {
      console.error("Failed to parse Kernel JSON response.");
      console.error(err);

      throw new Error(
        `Kernel returned a non-JSON response (${res.status}): ${responseText}`,
      );
    }

    if (!res.ok) {
      console.error("Kernel returned an error payload:");
      console.error(payload);

      throw translateKernelError(res.status, payload);
    }

    console.log("====================================");

    return payload as T;
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${env.kernelUrl}${path}`;

    console.log("========== KERNEL GET ==========");
    console.log("URL:", url);

    let res: Response;

    try {
      res = await fetch(url, {
        cache: "no-store",
      });
    } catch (err) {
      console.error("========== FETCH FAILED ==========");
      console.error(err);

      if (err instanceof Error) {
        console.error(err.stack);
        throw new Error(err.stack || err.message);
      }

      throw err;
    }

    console.log("Status:", res.status);
    console.log("Status Text:", res.statusText);

    const responseText = await res.text();

    console.log("Raw Response:");
    console.log(responseText);

    let payload: unknown = {};

    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch (err) {
      console.error("Failed to parse Kernel JSON response.");
      console.error(err);

      throw new Error(
        `Kernel returned a non-JSON response (${res.status}): ${responseText}`,
      );
    }

    if (!res.ok) {
      console.error("Kernel returned an error payload:");
      console.error(payload);

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
    companyId?: string,
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
