---
name: emlyn-vercel-patient-route-triage
description: "Use when Project Emlyn patient routes or public patient pages return 404/white-page behavior on Vercel or differ between local and production routing."
---

# Vercel Patient Route Triage

Use this skill for `/paciente/:slug`, `/pacientes/:slug`, `/p/:slug`, and `/assinatura/:slug` failures.

## Workflow

1. Reproduce the exact URL and note whether the failure is:
   - edge 404 from Vercel
   - HTML loads but assets 404
   - HTML loads but patient data is missing
2. Compare `vercel.json` and `scripts/dev-server.js` together.
3. Check `assinatura.html`, `index.html`, `app.js`, and `shared.js` for absolute asset paths and slug lookup behavior.
4. Prefer the smallest fix that survives static Vercel hosting:
   - keep `.html` as the rewrite target when rewrites are working
   - add a root `middleware.js` or `404.html` fallback when route delivery is flaky
5. Validate with:
   - `git diff --check`
   - `node --check` on changed JS files
   - a quick review of the exact route mapping in production

## Do Not

- Mix in Supabase debugging unless the page loads and only data is missing.
- Debug browser styling before confirming route delivery.
- Rewrite the whole app when a small route fallback is enough.

