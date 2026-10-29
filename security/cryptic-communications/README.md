# Cryptic Communications — EVE Defensive Foundation v1

**Status: source integrated, offline validation only. Hardware enforcement NOT INSTALLED.**

Independent Cryptic Communications OS design targeting Netgear R6080. This is **not OpenWrt firmware** and does not contain a bootable firmware image, wireless drivers, bootloader, flash layout, or safe device recovery plan. The existing Cryptic public web app and its routing behavior remain unchanged.

## Roles

- **GOD:** governance charter: operator ownership, least privilege, audit and recoverability.
- **ADAM:** evidence gates: DISCOVER → OBSERVE → NORMALIZE → CLASSIFY → VERIFY → FINGERPRINT → LOOKUP_REMEDY → APPLY_REMEDY → REVERIFY.
- **EVE:** default deny and explicit-deny precedence; no automatic pairing, casting or enrollment.
- **AZAZEL:** future Android-compatible terminal and authenticated capability broker; Android sandbox and OS hardware controls remain mandatory.
- **NEXUS:** quota of up to 6,000 **logical identity slots**, not 6,000 physical nodes, processes, or guaranteed concurrent connections.

The policy engine produces *offline, untrusted decision previews*. A caller can assert verification flags; those assertions are **not actual cryptographic verification**. Never expose this evaluator as an authorization endpoint or use its `allow-preview` output to change a firewall. Production needs signed/enrolled identities, trusted evidence receipts, a separately authenticated policy distributor, and device-local enforcement.

## Network shape

AT&T fiber gateway → Optiplex (dedicated physical Gigabit NIC for upstream) → separately cabled downstream Gigabit switch → servers/desktops and Netgear R6080 as limited 100 Mbps Wi-Fi edge. The Optiplex must be configured as a real router to enforce client egress policy. Do not connect alternate bypass uplinks or bridge the upstream and downstream networks together accidentally. Gigabit NIC capability, switch VLAN features and port wiring require onsite verification. IP Passthrough is optional, not a requirement. With NAT on AT&T, forwarded LAN traffic may use double NAT depending on design.

The R6080 does not have a Bluetooth radio. Network-side discovery services can be filtered on routed boundaries, but Bluetooth/BLE and casting enforcement belongs on each capable endpoint. Radio shielding, physical signal suppression, and bypassing OS security controls are not implemented or claimed.

## Files and verification

- `policy.public.json`: publishable EVE policy with **no allow rules**.
- `topology.public.json`: non-sensitive planning assumptions and no private IPs.
- `defense.mjs`: a pure offline validator, explicit-deny-first decision-preview engine and SHA-256 digest.
- `tests/cryptic-communications.test.mjs`: authorization boundary regression tests, run automatically by `npm test`.

Run from the repository root:

```sh
node security/cryptic-communications/defense.mjs
npm test
```

A successful test means source-level policy behavior passed. It does **not** prove a router firewall, Bluetooth state, Tailscale exit node, DNS enforcement, or firmware. Repo is public: private topology, device IDs, actual operator identities, runtime receipts and secrets belong outside this tree; credentials never in Git. Keep a physically accessible management and recovery channel and test rollback before installing any device policy.

## ADAM progression

1. **DISCOVER:** verify R6080 exact board, flash map, bootloader and recovery path; verify Optiplex adapters, switch capabilities and baseline connectivity.
2. **OBSERVE/NORMALIZE:** record interface/link/routing table data locally, redact before public promotion.
3. **CLASSIFY/VERIFY:** specify endpoint allowances for Bluetooth, Wi-Fi onboarding, casting, DNS and Tailscale; review verified operator identity.
4. **FINGERPRINT:** sign the private policy manifest and bind it to approved host keys (future implementation).
5. **LOOKUP_REMEDY/APPLY_REMEDY:** stage firewall policy with an out-of-band console, syntax validation and timed automatic rollback (future implementation).
6. **REVERIFY:** test permitted AND rejected connections, DNS leaks, IPv4/IPv6 forwarding, Tailscale exit-node traffic, Wi-Fi discovery, and recovery.

Do not mark production ready before those executable tests complete on the actual equipment.
