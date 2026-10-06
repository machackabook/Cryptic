# Cryptic DevTools Message Bus

Version 0.7.0

Cryptic exposes two browser entry surfaces:

- `CrypticConsole` for direct Developer Tools use.
- `CrypticBus` for transport-independent message routing.

## Console examples

```js
CrypticConsole.exec("status")
CrypticConsole.telemetry.snapshot()
await CrypticConsole.telemetry.send("devtools")
CrypticBus.routes()
await CrypticBus.command("status")
await CrypticBus.bridge("git.status")
```

## Routes

The same message frame can travel by:

- loopback: current page
- broadcast: other same-origin Cryptic tabs
- localhost: the signed 127.0.0.1 bridge
- edge: the dedicated bus.crypticnews.org relay
- deeplink: the HTTPS terminal URL

`CrypticBus.aggregate(kind,payload)` fans one message ID across the available routes and returns a receipt for each transport.

## URL terminal

```text
https://machackabook.github.io/Cryptic/terminal/?cmd=status&autorun=1
```

The installed PWA manifest registers the `web+cryptic:` protocol where supported by the browser.

## Telemetry dataset

Browser engineering telemetry remains local by default. If the localhost bridge is connected, signed `telemetry.snapshot` frames are written into:

```text
.cryptic/bus.jsonl
.cryptic/telemetry.jsonl
```

The edge relay acknowledges and fingerprints frames; it is not the canonical telemetry store.
