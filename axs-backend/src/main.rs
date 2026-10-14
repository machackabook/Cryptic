use clap::Parser;
use futures_util::{SinkExt, StreamExt};
use portable_pty::{CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};
use rand::{rngs::OsRng, RngCore};
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet, VecDeque},
    env, fs::{self, OpenOptions}, io::{Read, Write},
    net::SocketAddr, path::{Path, PathBuf},
    process::{Child as ProcessChild, Command as ProcessCommand, Stdio},
    sync::{Arc, Mutex as StdMutex}, time::Instant,
};
use subtle::ConstantTimeEq;
use tokio::{net::{TcpListener, TcpStream}, sync::{broadcast, Mutex}, time::{sleep, timeout, Duration}};
use tokio_tungstenite::{
    accept_hdr_async,
    tungstenite::{handshake::server::{ErrorResponse, Request, Response}, http::StatusCode, Message},
};

#[derive(Parser, Debug)]
#[command(author, version, about = "Cryptic AXS authenticated persistent PTY engine")]
struct Args {
    /// WebSocket port; the listener is always bound to 127.0.0.1.
    #[arg(short, long, default_value_t = 8767)]
    port: u16,
    /// Start local VNC + websockify only after verifying both programs exist.
    #[arg(long, default_value_t = false)]
    gui: bool,
    /// Start a clean sh session rather than the configured interactive shell.
    #[arg(long, default_value_t = false)]
    failsafe: bool,
    /// Exact allowed browser origin; may be repeated.
    #[arg(long = "origin")]
    origins: Vec<String>,
    /// Metadata-only append-only log path.
    #[arg(long)]
    log_file: Option<PathBuf>,
}

#[derive(Clone)]
struct AppState {
    token: Arc<Vec<u8>>,
    origins: Arc<HashSet<String>>,
    sessions: Arc<Mutex<HashMap<String, Arc<PtySession>>>>,
    events: broadcast::Sender<Value>,
    log_file: Arc<PathBuf>,
}

struct PtySession {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    child: Arc<Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
    started: Instant,
    scrollback: Arc<StdMutex<VecDeque<Value>>>,
}

fn random_token() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    hex::encode(bytes)
}

fn default_log_path() -> PathBuf {
    if let Ok(path) = env::var("XDG_STATE_HOME") {
        return PathBuf::from(path).join("cryptic-axs/events.jsonl");
    }
    env::var_os("HOME").map(PathBuf::from).unwrap_or_else(|| PathBuf::from("."))
        .join(".local/state/cryptic-axs/events.jsonl")
}

fn timestamp() -> String {
    let d = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    format!("unix:{:.3}", d.as_secs_f64())
}

fn append_event(path: &Path, event: &str, session_id: Option<&str>, details: Value) {
    let record = json!({"ts":timestamp(),"event":event,"session_id":session_id,"details":details,
        "privacy":"metadata-only; raw terminal input and pairing tokens are not logged"});
    if let Some(parent) = path.parent() {
        if fs::create_dir_all(parent).is_err() { return; }
        #[cfg(unix)] {
            use std::os::unix::fs::PermissionsExt;
            let _ = fs::set_permissions(parent, fs::Permissions::from_mode(0o700));
        }
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        #[cfg(unix)] {
            use std::os::unix::fs::PermissionsExt;
            let _ = file.set_permissions(fs::Permissions::from_mode(0o600));
        }
        if serde_json::to_writer(&mut file, &record).is_ok() { let _ = file.write_all(b"\n"); }
    }
}

fn backend_rss_bytes() -> Option<u64> {
    let status = fs::read_to_string("/proc/self/status").ok()?;
    for line in status.lines() {
        if let Some(rest) = line.strip_prefix("VmRSS:") {
            return rest.split_whitespace().next()?.parse::<u64>().ok()?.checked_mul(1024);
        }
    }
    None
}

fn valid_session_id(s: &str) -> bool {
    !s.is_empty() && s.len() <= 32 && s.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
}

fn history_snapshot(session: &Arc<PtySession>) -> Vec<Value> {
    session.scrollback.lock().map(|h| h.iter().cloned().collect()).unwrap_or_default()
}

fn push_history(history: &Arc<StdMutex<VecDeque<Value>>>, event: Value) {
    if let Ok(mut h) = history.lock() {
        h.push_back(event);
        while h.len() > 256 { h.pop_front(); }
    }
}

fn spawn_session(
    id: String, failsafe: bool, events: broadcast::Sender<Value>,
) -> Result<Arc<PtySession>, Box<dyn std::error::Error + Send + Sync>> {
    let pty = NativePtySystem::default();
    let pair = pty.open_pty(PtySize { rows: 24, cols: 80, pixel_width: 0, pixel_height: 0 })?;
    let shell = if failsafe { "sh".to_string() } else {
        env::var("SHELL").unwrap_or_else(|_| "sh".to_string())
    };
    let mut cmd = CommandBuilder::new(&shell);
    if !failsafe { cmd.arg("-i"); }
    cmd.env("TERM", "xterm-256color");
    cmd.env("CRYPTIC_AXS_SESSION", &id);
    cmd.env("CRYPTIC_AXS_FAILSAFE", if failsafe { "1" } else { "0" });
    let child = pair.slave.spawn_command(cmd)?;
    drop(pair.slave);
    let mut reader = pair.master.try_clone_reader()?;
    let writer = pair.master.take_writer()?;
    let master: Arc<Mutex<Box<dyn MasterPty + Send>>> = Arc::new(Mutex::new(pair.master));
    let writer: Arc<Mutex<Box<dyn Write + Send>>> = Arc::new(Mutex::new(writer));
    let child: Arc<Mutex<Box<dyn portable_pty::Child + Send + Sync>>> = Arc::new(Mutex::new(child));
    let scrollback = Arc::new(StdMutex::new(VecDeque::<Value>::new()));
    let tx = events.clone();
    let sid = id.clone();
    let history = scrollback.clone();
    tokio::task::spawn_blocking(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let event = json!({"type":"output","payload":{"session_id":sid.clone(),"data":String::from_utf8_lossy(&buf[..n]).into_owned()}});
                    push_history(&history, event.clone());
                    let _ = tx.send(event);
                }
                Err(e) => {
                    let _ = tx.send(json!({"type":"log","payload":{"session_id":sid.clone(),"level":"error","message":"PTY reader stopped","reason":e.kind().to_string()}}));
                    break;
                }
            }
        }
        let _ = tx.send(json!({"type":"session.exit","payload":{"session_id":sid}}));
    });
    let session_started = Instant::now();
    let tx = events.clone();
    let sid = id;
    tokio::spawn(async move {
        loop {
            sleep(Duration::from_secs(2)).await;
            let _ = tx.send(json!({"type":"metric","payload":{"session_id":sid.clone(),
                "uptime_seconds":session_started.elapsed().as_secs(),"backend_rss_bytes":backend_rss_bytes()}}));
        }
    });
    Ok(Arc::new(PtySession { writer, master, child, started: session_started, scrollback }))
}

fn start_gui() -> Result<Vec<ProcessChild>, String> {
    let exists = |name: &str| ProcessCommand::new("sh").arg("-lc")
        .arg(format!("command -v '{}' >/dev/null 2>&1", name.replace('\'', "")))
        .status().map(|s| s.success()).unwrap_or(false);
    if !exists("vncserver") || !exists("websockify") {
        return Err("GUI_NOT_CONFIGURED: --gui needs vncserver and websockify in PATH; no GUI process was started".into());
    }
    let vnc = ProcessCommand::new("vncserver")
        .args([":1", "-localhost", "yes", "-geometry", "1280x720", "-depth", "24"])
        .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null()).spawn()
        .map_err(|e| format!("VNC_START_FAILED: {e}"))?;
    match ProcessCommand::new("websockify").args(["127.0.0.1:6080", "127.0.0.1:5901"])
        .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null()).spawn() {
        Ok(proxy) => Ok(vec![vnc, proxy]),
        Err(e) => { let mut vnc=vnc; let _=vnc.kill(); let _=vnc.wait(); Err(format!("WEBSOCKIFY_START_FAILED: {e}")) }
    }
}

async fn handle_client(stream: TcpStream, peer: SocketAddr, state: AppState) {
    if !peer.ip().is_loopback() { return; }
    let allowed = state.origins.clone();
    let upgraded = accept_hdr_async(stream, move |request: &Request, response: Response| -> Result<Response, ErrorResponse> {
        let origin = request.headers().get("origin").and_then(|v| v.to_str().ok()).unwrap_or("");
        if origin.is_empty() || allowed.contains(origin) { Ok(response) }
        else { Err(tokio_tungstenite::tungstenite::http::Response::builder()
            .status(StatusCode::FORBIDDEN).body(Some("origin_not_allowed".to_string())).expect("valid error response")) }
    }).await;
    let ws = match upgraded { Ok(s) => s, Err(_) => return };
    let (mut sink, mut source) = ws.split();
    let first = match timeout(Duration::from_secs(10), source.next()).await {
        Ok(Some(Ok(Message::Text(text)))) if text.len() <= 4096 => text,
        _ => return,
    };
    let auth: Value = match serde_json::from_str(&first) { Ok(v) => v, Err(_) => return };
    let supplied = auth.get("token").and_then(Value::as_str).unwrap_or("").as_bytes();
    let expected = state.token.as_slice();
    let valid = supplied.len() == expected.len() && bool::from(supplied.ct_eq(expected));
    if auth.get("type").and_then(Value::as_str) != Some("auth") || !valid {
        append_event(&state.log_file, "auth.denied", None, json!({"peer":"loopback","reason":"invalid_or_missing_token"}));
        let _ = sink.send(Message::Text(json!({"type":"error","payload":{"code":"AUTH_REQUIRED"}}).to_string())).await;
        let _ = sink.close().await;
        return;
    }
    append_event(&state.log_file, "auth.accepted", None, json!({"peer":"loopback"}));
    if sink.send(Message::Text(json!({"type":"auth.ok","payload":{"protocol":"cryptic.axs.v1",
        "session_persistence":"enabled","raw_input_logging":"disabled"}}).to_string())).await.is_err() { return; }
    let ids: Vec<String> = state.sessions.lock().await.keys().cloned().collect();
    let _ = sink.send(Message::Text(json!({"type":"sessions","payload":{"items":ids}}).to_string())).await;
    let mut subscribed: HashSet<String> = HashSet::from(["main".to_string()]);
    if let Some(main) = state.sessions.lock().await.get("main").cloned() {
        for line in history_snapshot(&main) { let _ = sink.send(Message::Text(line.to_string())).await; }
    }
    let mut output_rx = state.events.subscribe();

    loop {
        tokio::select! {
            incoming = source.next() => {
                let msg = match incoming {
                    Some(Ok(Message::Text(text))) => text,
                    Some(Ok(Message::Ping(bytes))) => { if sink.send(Message::Pong(bytes)).await.is_err() { break; } continue; },
                    Some(Ok(Message::Close(_))) | None | Some(Err(_)) => break,
                    _ => continue,
                };
                if msg.len() > 64 * 1024 {
                    let _ = sink.send(Message::Text(json!({"type":"error","payload":{"code":"MESSAGE_TOO_LARGE"}}).to_string())).await; continue;
                }
                let v: Value = match serde_json::from_str(&msg) {
                    Ok(v) => v,
                    Err(_) => { let _=sink.send(Message::Text(json!({"type":"error","payload":{"code":"INVALID_JSON"}}).to_string())).await; continue; }
                };
                match v.get("type").and_then(Value::as_str).unwrap_or("") {
                    "input" => {
                        let id=v.pointer("/payload/session_id").and_then(Value::as_str).unwrap_or("main");
                        let data=v.pointer("/payload/data").and_then(Value::as_str).unwrap_or("");
                        if data.len()>32*1024 { let _=sink.send(Message::Text(json!({"type":"error","payload":{"code":"INPUT_TOO_LARGE"}}).to_string())).await;continue; }
                        if data.starts_with('#') {
                            let _=sink.send(Message::Text(json!({"type":"ai.status","payload":{"status":"NOT_CONFIGURED",
                                "message":"No authenticated AI adapter is configured; the prompt was not executed or sent to a provider."}}).to_string())).await;
                            append_event(&state.log_file,"ai.request.unconfigured",Some(id),json!({"bytes":data.len()}));continue;
                        }
                        if !subscribed.contains(id) { let _=sink.send(Message::Text(json!({"type":"error","payload":{"code":"SESSION_NOT_ATTACHED","session_id":id}}).to_string())).await;continue; }
                        let session=state.sessions.lock().await.get(id).cloned();
                        if let Some(session)=session {
                            if let Err(e)=session.writer.lock().await.write_all(data.as_bytes()) {
                                let _=sink.send(Message::Text(json!({"type":"error","payload":{"code":"PTY_WRITE_FAILED","reason":e.kind().to_string()}}).to_string())).await;
                            } else { append_event(&state.log_file,"terminal.input",Some(id),json!({"bytes":data.len()})); }
                        } else { let _=sink.send(Message::Text(json!({"type":"error","payload":{"code":"UNKNOWN_SESSION"}}).to_string())).await; }
                    }
                    "resize" => {
                        let id=v.pointer("/payload/session_id").and_then(Value::as_str).unwrap_or("main");
                        let cols=v.pointer("/payload/cols").and_then(Value::as_u64).unwrap_or(80).clamp(20,400) as u16;
                        let rows=v.pointer("/payload/rows").and_then(Value::as_u64).unwrap_or(24).clamp(5,200) as u16;
                        if !subscribed.contains(id) { continue; }
                        if let Some(session)=state.sessions.lock().await.get(id).cloned() {
                            if let Err(e)=session.master.lock().await.resize(PtySize{rows,cols,pixel_width:0,pixel_height:0}) {
                                let _=sink.send(Message::Text(json!({"type":"error","payload":{"code":"PTY_RESIZE_FAILED","reason":e.to_string()}}).to_string())).await;
                            } else { append_event(&state.log_file,"terminal.resize",Some(id),json!({"cols":cols,"rows":rows})); }
                        }
                    }
                    "session.create" => {
                        let id=v.pointer("/payload/session_id").and_then(Value::as_str).unwrap_or("session");
                        if !valid_session_id(id) { let _=sink.send(Message::Text(json!({"type":"error","payload":{"code":"INVALID_SESSION_ID"}}).to_string())).await;continue; }
                        let mut sessions=state.sessions.lock().await;
                        if sessions.contains_key(id) { drop(sessions);let _=sink.send(Message::Text(json!({"type":"error","payload":{"code":"SESSION_ALREADY_EXISTS","session_id":id}}).to_string())).await;continue; }
                        match spawn_session(id.to_string(),false,state.events.clone()) {
                            Ok(session) => {
                                sessions.insert(id.to_string(),session.clone());subscribed.insert(id.to_string());drop(sessions);
                                append_event(&state.log_file,"session.created",Some(id),json!({"shell":"default"}));
                                let _=sink.send(Message::Text(json!({"type":"session.created","payload":{"session_id":id}}).to_string())).await;
                                for line in history_snapshot(&session) { let _=sink.send(Message::Text(line.to_string())).await; }
                            }
                            Err(e) => { drop(sessions);let _=sink.send(Message::Text(json!({"type":"error","payload":{"code":"SESSION_CREATE_FAILED","reason":e.to_string()}}).to_string())).await; }
                        }
                    }
                    "session.attach" => {
                        let id=v.pointer("/payload/session_id").and_then(Value::as_str).unwrap_or("main");
                        let session=state.sessions.lock().await.get(id).cloned();
                        if let Some(session)=session {
                            subscribed.insert(id.to_string());
                            let _=sink.send(Message::Text(json!({"type":"session.attached","payload":{"session_id":id}}).to_string())).await;
                            for line in history_snapshot(&session) { let _=sink.send(Message::Text(line.to_string())).await; }
                        } else { let _=sink.send(Message::Text(json!({"type":"error","payload":{"code":"UNKNOWN_SESSION"}}).to_string())).await; }
                    }
                    "session.terminate" => {
                        let id=v.pointer("/payload/session_id").and_then(Value::as_str).unwrap_or("");
                        let confirm=v.pointer("/payload/confirm").and_then(Value::as_bool).unwrap_or(false);
                        if id=="main"||!confirm { let _=sink.send(Message::Text(json!({"type":"error","payload":{"code":"EXPLICIT_CONFIRMATION_REQUIRED_OR_MAIN_PROTECTED"}}).to_string())).await;continue; }
                        let session=state.sessions.lock().await.remove(id);
                        if let Some(session)=session {
                            let mut child=session.child.lock().await;let killed=child.kill().is_ok();let _=child.wait();
                            append_event(&state.log_file,"session.terminated",Some(id),json!({"kill_requested":killed}));
                            subscribed.remove(id);
                            let _=sink.send(Message::Text(json!({"type":"session.terminated","payload":{"session_id":id,"kill_requested":killed}}).to_string())).await;
                        }
                    }
                    "cursor" => {
                        let x=v.pointer("/payload/x").and_then(Value::as_f64).unwrap_or(0.0).clamp(0.0,1.0);
                        let y=v.pointer("/payload/y").and_then(Value::as_f64).unwrap_or(0.0).clamp(0.0,1.0);
                        let _=state.events.send(json!({"type":"cursor","payload":{"x":x,"y":y,"source":"client"}}));
                    }
                    "client_metric" => {
                        let rtt=v.pointer("/payload/rtt_ms").and_then(Value::as_f64).filter(|x|x.is_finite()&&*x>=0.0&&*x<600000.0);
                        let fps=v.pointer("/payload/fps").and_then(Value::as_f64).filter(|x|x.is_finite()&&*x>=0.0&&*x<1000.0);
                        append_event(&state.log_file,"client.metric",None,json!({"rtt_ms":rtt,"fps":fps}));
                    }
                    "client.log" => {
                        let level=match v.pointer("/payload/level").and_then(Value::as_str).unwrap_or("info") {
                            "debug"=>"debug","info"=>"info","warn"=>"warn","error"=>"error",_=>"info"
                        };
                        let code=v.pointer("/payload/code").and_then(Value::as_str).unwrap_or("client_event");
                        let safe:String=code.chars().filter(|c|c.is_ascii_alphanumeric()||matches!(c,'_'|'-'|'.')).take(64).collect();
                        append_event(&state.log_file,"client.log",None,json!({"level":level,"code":safe}));
                    }
                    _ => { let _=sink.send(Message::Text(json!({"type":"error","payload":{"code":"UNSUPPORTED_MESSAGE_TYPE"}}).to_string())).await; }
                }
            }
            event = output_rx.recv() => {
                match event {
                    Ok(v) => {
                        let id=v.pointer("/payload/session_id").and_then(Value::as_str);
                        let ty=v.get("type").and_then(Value::as_str).unwrap_or("");
                        if ty=="output" && id.map(|s|!subscribed.contains(s)).unwrap_or(true) { continue; }
                        if sink.send(Message::Text(v.to_string())).await.is_err() { break; }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => {
                        let _=sink.send(Message::Text(json!({"type":"status","payload":{"warning":"OUTPUT_GAP","message":"Client fell behind; PTY continues and scrollback remains available."}}).to_string())).await;
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        }
    }
    append_event(&state.log_file,"client.disconnected",None,json!({"session_persistence":"preserved"}));
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args=Args::parse();
    let bind=format!("127.0.0.1:{}",args.port);
    let listener=TcpListener::bind(&bind).await?;
    let token=env::var("AXS_TOKEN").unwrap_or_else(|_|random_token());
    if token.len()<32 { return Err("AXS_TOKEN must be at least 32 characters".into()); }
    let mut origins:HashSet<String>=HashSet::from([
        "https://machackabook.github.io".to_string(),"http://localhost:8080".to_string(),
        "http://127.0.0.1:8080".to_string(),"http://localhost:8767".to_string(),
        "http://127.0.0.1:8767".to_string(),"capacitor://localhost".to_string(),"http://localhost".to_string()
    ]);
    origins.extend(args.origins);
    let log_file=args.log_file.unwrap_or_else(default_log_path);
    let (events,_)=broadcast::channel::<Value>(2048);
    let state=AppState{token:Arc::new(token.as_bytes().to_vec()),origins:Arc::new(origins),
        sessions:Arc::new(Mutex::new(HashMap::new())),events:events.clone(),log_file:Arc::new(log_file.clone())};
    let main_session=spawn_session("main".into(),args.failsafe,events.clone())?;
    state.sessions.lock().await.insert("main".into(),main_session);
    let mut gui=if args.gui { start_gui().map_err(|e|std::io::Error::new(std::io::ErrorKind::Other,e))? } else { Vec::new() };
    append_event(&state.log_file,"backend.started",None,json!({"bind":bind,"gui":args.gui,"sessions":1,"port":args.port}));
    println!("[AXS] Authenticated PTY bridge listening on ws://{}",bind);
    println!("[AXS] PTY sessions survive browser detach while this backend process remains alive.");
    println!("[AXS] Metadata-only event log: {}",log_file.display());
    println!("[AXS] Allowed browser origins: {}",state.origins.iter().cloned().collect::<Vec<_>>().join(", "));
    println!("[AXS] LOCAL PAIRING TOKEN (keep private; paste into Cryptic AXS panel): {}",token);
    if args.gui { println!("[AXS] VNC on display :1 and WebSocket proxy bound to 127.0.0.1:6080."); }
    println!("[AXS] #prompt requests return NOT_CONFIGURED until a real authenticated AI adapter is added.");
    tokio::signal::ctrl_c().await?;
    append_event(&state.log_file,"backend.stopping",None,json!({"reason":"operator_interrupt"}));
    for child in &mut gui { let _=child.kill(); let _=child.wait(); }
    Ok(())
}