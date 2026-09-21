# Bottom's Line storefront

Custom Vinext storefront deployed as a Cloudflare Worker, with Supabase as the
private catalog/order database and Stripe Checkout planned for payments.

## Local development

```bash
pnpm install
pnpm dev
```

The local mock catalog is used when Supabase credentials are absent. To test
live catalog data locally, copy `.dev.vars.example` to `.dev.vars` and insert a
Supabase secret key. `.dev.vars` is ignored by Git.

## Production build

```bash
pnpm build
pnpm deploy:built
```

For Cloudflare Workers Builds connected to GitHub:

- Production branch: `main`
- Build command: `pnpm build`
- Deploy command: `pnpm deploy:built`
- Non-production branch deploy command: `pnpm exec wrangler versions upload --config dist/server/wrangler.json`

The Worker requires the encrypted runtime secret `SUPABASE_SECRET_KEY`.
`SUPABASE_URL` is non-secret configuration defined in `wrangler.jsonc`.

Never commit Supabase or Stripe secret keys. Add them through Cloudflare's
Variables and Secrets settings.
