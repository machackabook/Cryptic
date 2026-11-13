# UNIOMNI Public Knowledge Browser

A read-only Cloudflare Worker that indexes public metadata from `machackabook/ideal-enigma`.

- Public route: https://uniomni.crypticnews.org/
- Health: https://uniomni.crypticnews.org/healthz
- Indexed sources: public README sections, `release.json`, `layers/manifest.json`, and `docs/capabilities.json`.
- Search uses browser-side text matching and links directly to repository files.
- The page does not fetch private GAIA memory, cookies, OAuth sessions, or device files.
- The GAIA Memory Bridge link opens the separate owner-authenticated service; it does not transfer a session.

Deploy with:

```bash
npx wrangler deploy --config ./wrangler.jsonc
```
