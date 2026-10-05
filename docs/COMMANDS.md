# Cryptic HyperTerminal Commands — v0.6.0

```text
help
about
status
clear

token <scope>
tokens
ledger

request <provider> <payload>
/gemini <prompt>
/github <request>
/drive <request>
/ollama <prompt>
/openai <prompt>
/q <request>
/watson <request>

nodes
open <node>
gateway <node> <scope>

comms key-format
comms pair <node> <base64url-public-jwk>
comms seal <node> <message>

change <node> <proposal>

bridge connect <url> <secret>
bridge status
bridge action runtime.info
bridge action git.status
bridge action git.fetch
bridge action git.pull-ff

963 on
963 off
mandelbrot on
mandelbrot off
guardian
widget
```

## Important semantics

- `request` and provider shortcuts mint a local request receipt and, when reachable, an edge-signed capability token.
- `open` launches a public node surface. Same-origin integrated interfaces can mount inside Cryptic; cross-origin pages open externally to avoid pretending that iframe policies are under Cryptic's control.
- `comms seal` refuses to encrypt until a real recipient public key is paired.
- `change` produces a proposal and receipt only.
- `bridge action` is the current controlled native change path and cannot execute arbitrary user-supplied shell commands.
