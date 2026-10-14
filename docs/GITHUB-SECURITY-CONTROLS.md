# GitHub controls and auth integration

The authenticated repository inspection found `main` unprotected and no active
repository rulesets. The connected GitHub integration permits repository work but
cannot administer branch-protection settings. No live protection is claimed.

`security/github-main-ruleset.example.json` is a disabled review template. An owner
must validate its current GitHub API schema, select a trusted second reviewer,
restore working GitHub Actions runners, confirm the real `audit` check name, and
activate it through repository settings. It prevents branch deletion and force
pushes, requires a reviewed PR and fresh strict status checks, and resolves review
threads before merge. Do not enable a required check while it cannot execute.

Enable repository secret scanning/push protection and Dependabot alerts when
available to the repository plan. Review collaborator permissions and remove stale
write access. These are administration steps, not effects of an advisory file.
Both workflows use read-only permissions and pinned action revisions; checkout does
not retain repository credentials. Dependabot is configured to propose weekly
GitHub Actions updates. Security artifacts expire after 30 days. Private collector
state is ignored by Git and cannot be served
by the local HTTP handlers. Existing crawler/AI policy files remain advisory; they
do not authenticate Google, GitHub or devices.

## Manual Google entry supplied by the owner

The owner supplied:

https://ais-dev-7nne5e6hglrfzmh4uwqef4-697850819377.us-east1.run.app

An unauthenticated browser inspection observed a redirect to Google sign-in through
an AI Studio applet auth bridge. The console opens this exact URL in a separate tab
with no opener/referrer and sends no collector token, private device data or callback
parameters. It does not scrape an authenticated app session.

This is an external manual entry, not a verified collector OIDC adapter. To authorize
the collector with Google, define the issuer/client audience/callback, verify token
signatures and issuer/audience/expiry server-side, use state/nonce and PKCE where
applicable, and check the approved principal/device scopes before issuing a collector
session. Until that contract is provided and tested, the existing operator-token gate
and default-deny Cloudflare Access application remain in effect.

The same distinction applies to the `machackabook` repository connection: it
authorizes repository operations here, but it cannot stand in for a dedicated GitHub
OAuth client configured as a Cloudflare Access identity provider. Credentials belong
in private stores, never browser URLs, committed configs, reports or public datasets.
