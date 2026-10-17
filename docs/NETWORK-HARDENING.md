# DNS and Tailscale hardening for PR #4

This change supplies tested offline guardrails and optional public DNS observations.
It does not modify DNS records, enroll devices, apply a live tailnet policy, enable
private routing, or establish production verification. The current review workspace
has no configured VPN, and its HTTP proxy is unreachable. No live DNS or tailnet
result is claimed.

## DNS policy and evidence

`config/network-security.public.json` is deliberately unconfigured. It contains the
existing public Cryptic domain and two known public hosts, but no private network
inventory. `npm run audit:network` validates its shape and the example tailnet policy.

The optional observer queries pinned HTTPS DoH endpoints at Cloudflare and Google.
It validates names and resolver selections before requests, refuses redirects,
uses bounded timeouts/response sizes, and never attaches credentials. Both resolvers
must assert DNSSEC validation (`AD=true`) with checking enabled. It checks A/AAAA
answers for private, loopback, link-local, shared-address, multicast and selected
reserved ranges; checks TTL bounds; and requires approved CAA issuers plus explicit
wildcard issuance denial. IPv4-mapped and transition IPv6 addresses are rejected.

DNSSEC `AD` is a trusted recursive resolver's assertion. These observations do not
perform local cryptographic chain verification, prove domain ownership, detect every
dangling SaaS binding, or establish TLS/application authentication. A valid HTTPS
resolver connection is not proof of system-wide encrypted DNS. Answer-set hashes
are evidence references, not a privacy mechanism for secrets. Geographic answers
may differ; no automatic consensus or authenticity claim follows from matching hashes.

Before live observation, an authorized operator should:

1. Inventory actual certificates and intended issuers. Configure CAA at the zone
   through the DNS provider, including `issuewild ";"` if wildcard certificates are
   intentionally prohibited. Do not impose the template blindly on existing services.
2. Enable DNSSEC with the authoritative provider and publish the correct DS record
   at the registrar. Verify the delegation before requiring signed answers; an
   incorrect rollover or DS record can make the domain unavailable.
3. Configure registrar MFA/transfer locking and restrict DNS write tokens to the
   required zone/actions. Keep credentials in a private secret store and review audit
   logs. Retain the prior records/DS plan for a coordinated rollback.
4. Create a private copy of the JSON, set `configured=true` and the actual approved
   `expectedCaaIssuers`, and retain only public hosts in its DNS section. Run:

   ```sh
   CRYPTIC_NETWORK_POLICY_PATH=/private/path/network-policy.json node scripts/network-security.mjs --dns-live
   ```

For GitHub Actions, store the JSON in `CRYPTIC_NETWORK_POLICY_JSON`. Manual runs use
the `dns_live` checkbox; scheduled DNS observation additionally requires the repository
variable `CRYPTIC_DNS_MONITOR_ENABLED=true`. Missing/invalid configuration fails the
observation instead of claiming success. Temporary configuration is mode 0600 and
removed after the run. Reports omit raw answers and configuration; artifacts are
retained for 30 days and have a checksum manifest. A retained trusted artifact anchor
is still required for integrity comparison.

## Tailscale policy and private service boundary

`security/tailscale-policy.example.json` uses explicit operator identities, narrowly
owned bridge/resolver tags, and two grants: operators to bridge HTTPS on TCP 443;
bridge to the private DNS resolver on TCP/UDP 53. The template denies Tailscale SSH,
direct bridge TCP 7331, and arbitrary member access. It includes allow/deny test cases.
No wildcard grants, ACL fallback, automatic route approval, Funnel, or internet exit
permission is accepted by the offline contract checker.

The checker validates this repository's narrow JSON contract. It is not Tailscale's
policy compiler or a test of live packet filtering. Edit a **private** copy with actual
principals; do not commit real tailnet membership, auth keys, device identities, or
resolver IPs to this public repository. A tailnet administrator must validate the
policy and tests in Tailscale before applying it. Preserve required existing services
in a staged rollout instead of replacing the entire policy blindly.

On an independently managed host, the deployment model keeps the Cryptic bridge
bound to loopback and uses tailnet-only Tailscale Serve HTTPS to proxy to it. Do not
enable Funnel. Transport authorization complements the bridge bearer secret and
fresh scoped capability checks; it does not replace them. The public browser's
bridge profile remains loopback-only, and this change does not teach it private
tailnet endpoints or enrollment credentials.

For that managed host, deliberately review route acceptance, subnet advertisement,
exit-node use, Tailscale SSH, device approval, expiry, short-lived single-use enrollment
credentials, and administrator MFA. Split DNS should direct only the required private
zone to the tagged resolver. Keep MagicDNS/private queries out of public DoH monitoring.
DoH alone does not encrypt a separate UDP/TCP 53 tailnet resolver's upstream traffic;
configure its validating upstream and DNSSEC policy on the resolver itself.

Useful official references for administrator validation:

- [Tailscale grants](https://tailscale.com/kb/1324/grants)
- [Tailnet policy syntax and tests](https://tailscale.com/kb/1337/policy-syntax)
- [DNS and MagicDNS](https://tailscale.com/kb/1054/dns)
- [Tailscale Serve](https://tailscale.com/kb/1312/serve)
- [Cloudflare DNSSEC](https://developers.cloudflare.com/dns/dnssec/)

The managed Codex environment is a different boundary: its Tailscale service lives
in the sidecar. Do not install/reconfigure a second client to repair it. Its current
configuration reports `vpn_configured=false`; approved environment configuration
and TCP/HTTP grants are required before private transport can be tested. A browser
or offline template check cannot change or attest that boundary.

## Document and release evidence

The [document evidence map](DOCUMENT-EVIDENCE.md) and public provenance JSON retain
five byte fingerprints and precise source citations. GAIA's local/opt-in/minimal-record
requirements inform these controls. The GPS datasheets are vendor references;
they do not supply DNS/Tailscale software or prove hardware is installed.

Source receipts use the exact event base/head revisions with NUL-delimited filenames.
Unavailable/mismatched revisions fail instead of producing an empty successful diff.
Fleet reports explicitly describe default-branch source coverage, not the deployed
Pages branch or Actions artifact. Static checks cannot pass the PRODUCTION_VERIFIED
gate: deployed browser checks, backend authorization, authoritative DNS evidence,
and live tailnet enforcement still require their own measured results.
