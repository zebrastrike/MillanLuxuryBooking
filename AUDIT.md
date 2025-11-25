# Security and Reliability Audit

## High-Risk Issues

### Unauthenticated admin surfaces when Clerk is misconfigured
Admin protection short-circuits whenever Clerk keys are absent, meaning every admin-only route (uploads, content management, contact message retrieval) becomes publicly accessible if environment variables are missing or mistyped. The `/api/auth/user` endpoint also auto-creates a privileged "dev-admin" user with no authentication in this mode, so a configuration slip in production would expose full administrative control.
- Location: `server/routes.ts` (`createIsAdminMiddleware` bypass and dev admin fallback).【F:server/routes.ts†L24-L156】

### Unbounded in-memory file uploads with unsafe filenames
Uploads use `multer.memoryStorage()` with no size limits or MIME validation. Attackers can exhaust memory or upload unexpected content. Filenames are constructed with the raw `originalname`, allowing path-like values (e.g., containing slashes or Unicode control characters) to propagate to Vercel Blob keys.
- Location: `server/routes.ts` (upload handler and memory storage setup).【F:server/routes.ts†L18-L201】

### PII leakage through response-body logging
A global middleware logs full JSON responses for every `/api` request. This captures sensitive fields (contact form messages, user profiles) and writes them to application logs, increasing risk of inadvertent disclosure and complicating compliance.
- Location: `server/index.ts` (response logging middleware).【F:server/index.ts†L25-L52】

### Error handler rethrows after responding
The Express error handler returns an HTTP response and then rethrows the error, which can crash the process and lead to downtime instead of isolating the failure to the request scope.
- Location: `server/index.ts` (global error handler).【F:server/index.ts†L55-L64】

## Medium/Operational Risk

### No abuse protection on public contact form
The contact submission endpoint is fully unauthenticated and lacks throttling or bot protection. This leaves the application open to spam, storage abuse, or email flooding without any rate limiter or CAPTCHA guardrail.
- Location: `server/routes.ts` (contact form handler).【F:server/routes.ts†L204-L229】

## Recommendations
- Enforce admin authentication regardless of Clerk availability; fail closed when credentials are missing and avoid auto-provisioning privileged accounts in production configurations.
- Add upload constraints: size limits, MIME/type checks, safe filename normalization, and preferably streaming to avoid memory pressure.
- Remove or redact response-body logging for endpoints that handle user data; log request IDs and status codes instead.
- Adjust error handling to log and continue without rethrowing after a response has been sent.
- Introduce rate limiting and bot-detection (e.g., CAPTCHA) on public forms to limit abuse.
