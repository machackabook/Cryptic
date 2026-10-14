# Cryptic AXS Backend

This optional Rust helper is started explicitly by the operator. The public Cryptic page never downloads or launches a shell process.

## Build in Termux

\`\`\`bash
pkg update -y
pkg install -y rust clang make pkg-config openssl-tool
cd axs-backend
cargo build --release
\`\`\`

Resolve any toolchain/dependency issue instead of replacing the PTY engine with a mock.

## Run

\`\`\`bash
./target/release/cryptic-axs-backend --port 8767
\`\`\`

The service binds to \`127.0.0.1\` only. Startup prints a random 256-bit process token. Paste it into the Cryptic AXS panel; that panel keeps the token in memory only. Never put it in a URL, source file, screenshot or log.

Optional GUI support:

\`\`\`bash
./target/release/cryptic-axs-backend --port 8767 --gui
\`\`\`

This requires \`vncserver\` and \`websockify\` already installed. It requests VNC display \`:1\` with \`-localhost yes\` and websockify on \`127.0.0.1:6080\` forwarding to \`127.0.0.1:5901\`. It does not install a desktop environment or claim GUI readiness when process startup fails. Expose neither port to the LAN.

## Message protocol

The first WebSocket frame is \`{"type":"auth","token":"<local pairing token>"}\`. After \`auth.ok\`, clients can send \`input\`, \`resize\`, \`session.create\`, \`session.attach\`, explicitly confirmed \`session.terminate\` for non-main sessions, \`cursor\`, \`client_metric\`, and \`client.log\` metadata events.

PTY sessions survive WebSocket detach/reattach while the backend process remains alive. A bounded in-memory scrollback replays the most recent output when a session is reattached. The append-only event file omits raw command text and pairing tokens. \`#prompt\` requests report \`NOT_CONFIGURED\` until a real authenticated AI adapter is implemented.
