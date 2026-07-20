# Orbit Gateway - The Security Guard

## Purpose

The Gateway is the public backend of the Orbit Platform, and the ONLY
backend exposed to the Frontend, mobile apps, or partner integrations.
Think of it as a security guard at a building entrance: it checks that
you're carrying some form of ID before letting you further in, logs
who came through and when, and rejects obviously malformed requests -
but it never decides who you are, what company you belong to, or what
you're allowed to do once inside. That decision is made by one authority
only, every single time: the Orbit Kernel.

The Gateway is **not** responsible for executing business logic, and as
of this version, it doesn't even hold session state of its own - no
signed cookie, no local JWT, nothing it could be wrong about. It is a
stateless relay with a memory only as long as one request.

---

## System communication, end to end

```
                    ORBIT FRONTEND (the display)
                              │
                              ▼
                    ORBIT GATEWAY (the security guard)
                              │
                              ▼
                     ORBIT KERNEL (the brain)
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
             SUPABASE                 POSTGRES
        (identity only: UUID,     (everything else: companies,
         password checks,          users, permissions, audit log
         token issuance)           - VPN/private, self-hosted)
```

Every request - auth or otherwise - makes this exact trip. The Gateway
never shortcuts to Supabase, never shortcuts to Postgres, and never
answers a question ("is this user still logged in?", "what can they
do?") using data it's holding onto itself. It asks the Kernel. Every time.

---

## Worked example: sign up

This is the concrete flow, matching exactly how it's implemented:

```
1. Frontend
   User fills in {email, password, company_name} and submits.
   Frontend calls gateway.post("/auth/signup", { ... }).
   The Frontend does not touch Supabase at all anymore.

2. Gateway  →  POST /api/auth/signup
   - signupSchema.safeParse() checks the shape only (valid email,
     password length, company_name present). No business validation.
   - Forwards the body UNCHANGED to the Kernel:
       kernelClient.signup(input)
       → POST {KERNEL_URL}/kernel/v1/auth/signup
         (X-Gateway-Secret header proves the call came from the Gateway)

3. Kernel  →  kernel/kernel_api/auth_routes.py: signup()
   Step 1: supabase_auth.create_user(email, password)
           → calls Supabase Admin API with the service-role key
           → Supabase creates the identity and returns a UUID
   Step 2: create_company_and_owner(pool, user_id=<that UUID>, ...)
           → single Postgres transaction (self-hosted, VPN-only):
             INSERT INTO users, INSERT INTO companies,
             INSERT INTO company_members (role='owner')
           → if any insert fails, the whole transaction rolls back
   Step 3: supabase_auth.password_grant(email, password)
           → signs the new user in immediately, gets access/refresh tokens
   Step 4: AuditLogger.record("auth.signup", ...)
   Step 5: Returns { identity, company, session } to the Gateway

4. Gateway
   - Receives the Kernel's result.
   - setAuthCookies(session): stores access_token/refresh_token as
     httpOnly cookies. The Gateway does not decode or interpret these
     tokens - it only stores and forwards them on future requests.
   - Normalizes the response into one flat SessionView shape and
     returns { session } to the Frontend.

5. Frontend
   - AuthContext stores the returned session.
   - Router pushes to /overview.
   - If step 2 or 3 had failed inside the Kernel (e.g. duplicate email,
     Postgres constraint violation), the Kernel returns an error status,
     the Gateway relays it verbatim as { error: { code, message } }, and
     the Frontend shows it on the signup form. Nothing is left dangling:
     a half-created Supabase user with no company row can't happen,
     because step 2 is a single atomic transaction.
```

Login, session-check, and logout follow the identical shape - Frontend
→ Gateway (shape-check only) → Kernel (real decision, real Supabase/
Postgres calls) → Gateway (relay) → Frontend. See `src/app/api/auth/`.

---

## Every other request, not just auth

Once a session exists, every domain request (companies, dashboard,
workflows, providers, analytics, graph, replay, ai, marketplace,
enterprise, system) follows the same non-negotiable path:

```
Frontend → gateway.ts → /api/<domain> route
    → requireAccessToken()   (guard duty: is a credential even present?)
    → kernelClient.execute({ workflow, payload, supabase_access_token })
    → POST {KERNEL_URL}/kernel/v1/execute
    → Kernel re-verifies the token AND re-resolves company/permissions
      from Postgres, fresh, on this call - nothing is trusted from a
      prior request.
    → Kernel dispatches to the Workflow Engine (or returns 501 if that
      workflow isn't implemented yet - an honest answer, not a fake 200)
    → Gateway relays the Kernel's response verbatim to the Frontend
```

No route in this repository decides authorization, and none of them
ever will - if you're adding a new capability, the permission check
belongs in the Kernel's Permission Engine / Rule Engine, not here.

---

## Repository Structure

```
orbit-gateway/
├── README.md
├── middleware.ts                    # cheap "is a credential present" check
├── package.json / tsconfig.json / next.config.ts
│
├── src/
│   ├── app/api/
│   │   ├── auth/signup/route.ts       # → Kernel /auth/signup
│   │   ├── auth/login/route.ts        # → Kernel /auth/login
│   │   ├── auth/session/route.ts      # GET → Kernel /identity/resolve
│   │   ├── auth/logout/route.ts       # → Kernel /auth/logout
│   │   ├── health/route.ts             # aggregated gateway + kernel health
│   │   ├── companies/ dashboard/ providers/ workflows/ analytics/
│   │   ├── graph/ replay/ ai/ marketplace/ enterprise/ system/
│   │   │      # all forward to Kernel /execute - no local stubbing
│   │   └── webhooks/route.ts           # public, signature-verified (stub)
│   │
│   ├── gateway/
│   │   ├── kernel/
│   │   │   ├── kernel.client.ts        # the ONLY thing that calls the Kernel
│   │   │   ├── kernel.types.ts
│   │   │   ├── kernel.errors.ts
│   │   │   └── session-view.ts          # normalizes Kernel responses for the Frontend
│   │   ├── auth/cookies.ts              # stores/forwards tokens - never interprets them
│   │   ├── validation/auth.schema.ts    # shape checks only
│   │   ├── middleware/require-access-token.ts  # presence check only
│   │   ├── security/ logging/ monitoring/ routing/ config/
│   │
│   ├── services/auth.service.ts        # thin: call Kernel, manage cookies
│   ├── schemas/ types/ utils/ config/ shared/
```

---

## Responsibilities

The Gateway is responsible for: receiving HTTP requests, checking a
credential is present, request shape validation, rate limiting, API
versioning, audit-relevant logging, request routing, error translation,
response formatting/normalization, webhook reception, health monitoring.

The Gateway is explicitly **not** responsible for: deciding who a user
is, deciding what a user can do, workflow execution, financial
calculations, provider orchestration, AI reasoning, replay simulations,
ledger updates, or any business rule whatsoever. Those belong exclusively
to the Orbit Kernel.

---

## Local Setup

1. `cp .env.example .env` and fill in:
   - `KERNEL_URL` (e.g. `http://localhost:8000`)
   - `GATEWAY_SHARED_SECRET` - **must exactly match** the Kernel's `.env`
2. `npm install`
3. `npm run dev` (defaults to `http://localhost:3000`, run the Kernel
   first or requests will fail with `KERNEL_UNAVAILABLE`)
4. `curl http://localhost:3000/api/health`

---

## Development Rules

1. The Gateway contains no financial logic, and no identity/permission logic.
2. Every non-public request must present a credential; whether that credential is *valid* is decided by the Kernel, not here.
3. Every request must be shape-validated before reaching the Kernel.
4. Services never implement business rules - they call the Kernel and manage cookies, nothing else.
5. The Kernel Client is the only component allowed to communicate with the Orbit Kernel.
6. API routes remain thin and delegate immediately to the Kernel via `/execute` or a dedicated auth endpoint.
7. All requests must be logged.
8. All errors must be standardized before returning to clients.
9. The Gateway holds no session state of its own - cookies carry Kernel-issued tokens, not Gateway-issued ones.
10. Business orchestration belongs exclusively to the Orbit Kernel.
