# Cryptic Architecture v0.5.0

```text
COSMIC GUARDIAN GATE
        │
        ▼
BROWSER / PWA HYPERTERMINAL
        │
        ├─ Mandelbrot field
        ├─ 963 Hz sonification
        ├─ BottomRight AI widget
        ├─ local provenance ledger
        └─ per-request runtime token broker
                │
                ├─ Gemini
                ├─ GitHub
                ├─ Google Drive
                ├─ Ollama
                ├─ OpenAI
                ├─ Amazon Q
                ├─ IBM Watson
                └─ Local Bridge
                        │
                        ▼
                 127.0.0.1:7331
                 restricted probes
```

## Runtime token contract

Every requested adapter operation mints a fresh opaque `crt.*` token. The UI stores active tokens in `sessionStorage` only and writes only the token fingerprint to the persistent local ledger. Default TTL: 10 minutes.

These tokens are **request receipts/scopes**, not replacements for OAuth, API keys, or service credentials. Real provider credentials remain in provider-managed auth flows, environment variables, OS keychains, or a hardened backend.

## Integrated source concepts

The public surface consolidates the uploaded HyperTerminal/Polyglot Command Center concepts with the Cosmic Guardian gate, the HWAD 963 Hz sonification concept, the BottomRight expanding widget, a Mandelbrot traversal field, Memory-Fabric-style provenance receipts, and an explicit browser/native boundary.
