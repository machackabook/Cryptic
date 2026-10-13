# Cryptic Public-Surface Security Review

Review scope: the public GitHub Pages tree in `machackabook/Cryptic`. This document records source-level controls and boundaries; it is not a claim of a passing external security or Lighthouse score.

## Baseline controls

- Preserve the existing public/private split. GitHub Pages is public; client-side gates and `robots.txt` cannot make published files private.
- Keep the entry page's Content Security Policy restrictive and limit local bridge connections to the documented development and bridge ports.
- The repository contains `_headers` for Cloudflare Pages deployments. GitHub Pages does **not** apply that file as response headers; the CSP meta tag is the static-host fallback, and `frame-ancestors`, HSTS and other response-only policies must be enforced by an appropriate proxy/CDN.
- `robots.txt`, `X-Robots-Tag` and the AI access policy are advisory against compliant crawlers only. They do not prevent a client from reading content that is public.
- Keep third-party script/CDN dependencies out of the boot-critical page; provider cards should link to official services rather than embed credentials.
- Restrict iframe sandboxing and external links; use `rel="noopener noreferrer"` for new browsing contexts.
- Browser telemetry stays local unless an explicit gateway or local bridge operation is triggered. Do not send raw prompts, secrets, or note bodies as telemetry.

## Functional verification targets

1. Each main nav control activates its matching page.
2. Pop-out module URLs resolve against the published `panel.html`, validate module IDs against `modules/manifest.json`, and render a close control.
3. Panel hide/collapse/ghost/duplicate/pop-out controls must not claim provider access or mutate system state by themselves.
4. Browser capability checks must distinguish **PASS**, **UNVERIFIED**, **DEGRADED**, and **UNSUPPORTED**; never synthesize success receipts.
5. Provider actions require the provider/backend's actual authenticated response. A button click or locally minted receipt is not authentication.
6. Source links must resolve to canonical repository, documentation, or API destinations. API keys and bearer credentials must not be placed in URL query strings or committed source.

## Remaining deployment checks

- Validate response headers from the actual custom domain or CDN, since GitHub Pages cannot enforce `_headers`.
- Run keyboard-only navigation and an accessibility audit on desktop and mobile widths.
- Run the repository's `npm run lint` and `npm run test:security` scripts in a controlled checkout.
- Verify Cloudflare gateway and bus endpoints using live requests; source code alone does not establish availability.
- Search repository history and all relevant branches for secrets. The repository's static pattern scanner is useful but not a complete secret or supply-chain audit.

## No false score claims

No Lighthouse, SEO, accessibility, privacy, penetration-test, or external-analysis score is asserted by this source review. Re-run the tests against the deployed artifact before promotion through the ADAM evidence gates.
