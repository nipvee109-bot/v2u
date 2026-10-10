# Deploy: GitHub Pages

Live URL: https://nipvee109-bot.github.io/v2u/

`.github/workflows/deploy-pages.yml` runs on every push to `master`: `npm ci` → `npm test` →
`npm run build` (base `/v2u/`) → copies `index.html` to `404.html` so deep links such as
`/v2u/learn/curriculum/<id>` survive a refresh → `scripts/check-dist-secrets.mjs` → deploy.

`npm run dev` still serves at `/` on localhost; only `vite build` uses `/v2u/` (override with `V2U_BASE`).

## One-time owner setup

1. **Pages source** — Settings → Pages → Build and deployment → Source: **GitHub Actions**.
   (Pages on a private repository needs a paid GitHub plan.)
2. **Build variables** — Settings → Secrets and variables → Actions → **Variables** tab:
   - `VITE_SUPABASE_URL` — the project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — the public publishable/anon key

   Both are public browser values. Never add a service-role/`sb_secret_` key, database
   password or Google client secret; the build refuses a secret key and the scan fails the job.
   Without these variables the site deploys in guest mode (no Google sign-in).
3. **Supabase Auth** — Dashboard → Authentication → URL Configuration:
   - keep `http://localhost:5173/**` in Redirect URLs (development keeps working)
   - add `https://nipvee109-bot.github.io/v2u/**`
   - set Site URL to `https://nipvee109-bot.github.io/v2u/`. Supabase falls back to the
     Site URL when a redirect is not allowlisted, so leaving it at localhost would send
     production users to localhost after Google sign-in.
4. **Google Cloud** — the Authorized redirect URI stays Supabase's
   `https://rnerufxwzfhugurlfhce.supabase.co/auth/v1/callback`. Add
   `https://nipvee109-bot.github.io` to Authorized JavaScript origins next to `http://localhost:5173`.
