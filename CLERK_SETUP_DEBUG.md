# Clerk Authentication Debug Guide

## Current Issue: Infinite Redirect Loop

If you see this error in logs:
```
Clerk: Refreshing the session token resulted in an infinite redirect loop. 
This usually means that your Clerk instance keys do not match
```

## Diagnostic Checklist

### Understand the current fallback

- When either Clerk key is missing, the site runs in a **development-only** mode that skips Clerk and uses a local admin account so you can still reach the dashboard. This is meant for debugging only and is **not secure for production**.
- To restore full authentication (recommended for production), you must configure the real Clerk keys below.

### 1. Verify Clerk Keys Match on Vercel

Go to **Vercel Project → Settings → Environment Variables** and check:

- [ ] `VITE_CLERK_PUBLISHABLE_KEY` is set to your publishable key (format: `pk_test_...` or `pk_live_...`)
- [ ] `VITE_CLERK_FRONTEND_API` is set when using a custom Clerk domain (e.g., `clerk.millanluxurycleaning.com`) to avoid hydration issues
- [ ] `CLERK_SECRET_KEY` is set to your secret key (format: `sk_test_...` or `sk_live_...`)
- [ ] `VITE_CLERK_ADMIN_EMAIL` matches the single owner email for the Clerk instance (client-side guard)
- [ ] `ADMIN_EMAIL` or `ADMIN_EMAILS` includes the same owner email on the server
- [ ] Both keys are from the **same Clerk environment** (test or production)
- Optional: set `ADMIN_EMAILS` to a comma-separated list (e.g., `owner@example.com,manager@example.com`) to automatically grant admin access to those accounts even if they were not the first signup.

**IMPORTANT:** Test keys won't work with production domains and vice versa!

### 2. Check Clerk Dashboard Settings

Go to **Clerk Dashboard → Settings → API & Keys**:

#### For Development (test keys):
- Only use with `localhost:3000` or `.repl.dev` domains

#### For Production (live keys):
- Use with your actual domain (`millanluxurycleaning.com`)

### 3. Configure Clerk App Instance

In **Clerk Dashboard → Settings → Domains**:

- [ ] Add domain: `millanluxurycleaning.com`
- [ ] For Vercel deployments, also add: `*.vercel.app`

### 4. Set Redirect URLs

In **Clerk Dashboard → Settings → Paths**:

- [ ] After sign-in fallback: `/admin` (relative path only!)
- [ ] After sign-up fallback: `/`
- [ ] After logo click: `/`

**Common mistake:** Using full URLs instead of relative paths (e.g., `/admin` not `https://millanluxurycleaning.com/admin`)

### 5. Verify CORS Settings (Optional)

In **Clerk Dashboard → Settings** (if available):
- [ ] Allowed Origins: `https://millanluxurycleaning.com`

---

## Quick Test

After fixing Clerk settings:

1. Redeploy on Vercel (or restart dev server)
2. Go to `/admin`
3. You should see Clerk's login form (not a redirect loop)

---

## If Still Not Working

1. **Clear browser cache** - Full refresh (Cmd+Shift+R or Ctrl+Shift+R)
2. **Check Vercel logs** - Look for any 401/403 errors
3. **Verify environment variables deployed** - Redeploy after changing Vercel env vars
4. **Use incognito window** - Test with no cached sessions

---

## Key Differences: Test vs Live Keys

| Type | Format | Domain | Use Case |
|------|--------|--------|----------|
| Test Key | `pk_test_*` / `sk_test_*` | localhost, .repl.dev | Development |
| Live Key | `pk_live_*` / `sk_live_*` | Your actual domain | Production |

**Mixing keys = Infinite Redirect Loop** 🔄❌

---

## Logs to Check

Run `npm run dev` and look for:

```
[DEBUG] Clerk Publishable Key detected: pk_test_...
[DEBUG] Clerk Secret Key detected
[DEBUG] ✅ Both Clerk keys are configured
```

If you see errors like:
```
[ERROR] ❌ Clerk authentication will not work - missing keys!
```

Your environment variables aren't set correctly.
