use std::{
    collections::{HashMap, VecDeque},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;

#[derive(Clone, Debug)]
struct OpenFileRequest {
    request_id: u64,
    path: String,
    source: &'static str,
}

#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenFilePayload {
    request_id: u64,
    path: String,
    content: String,
    source: &'static str,
}

const IN_FLIGHT_TTL: Duration = Duration::from_secs(5 * 60);
const MAX_IN_FLIGHT_REQUESTS: usize = 128;

struct InFlightOpenFile {
    request: OpenFileRequest,
    emitted_at: Instant,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum InFlightEvictionReason {
    Timeout,
    Capacity,
}

impl InFlightEvictionReason {
    fn as_str(self) -> &'static str {
        match self {
            Self::Timeout => "timeout",
            Self::Capacity => "capacity",
        }
    }
}

struct InFlightEviction {
    request: OpenFileRequest,
    reason: InFlightEvictionReason,
}

#[derive(Default)]
struct OpenFileCoordinatorInner {
    frontend_ready: bool,
    pending: VecDeque<OpenFileRequest>,
    in_flight: HashMap<u64, InFlightOpenFile>,
}

struct OpenFileCoordinator {
    next_request_id: AtomicU64,
    inner: Mutex<OpenFileCoordinatorInner>,
}

impl Default for OpenFileCoordinator {
    fn default() -> Self {
        Self {
            next_request_id: AtomicU64::new(1),
            inner: Mutex::new(OpenFileCoordinatorInner::default()),
        }
    }
}

enum OpenFileSubmission {
    Queued { request_id: u64, queue_size: usize },
    Ready(OpenFileRequest),
}

impl OpenFileCoordinator {
    fn submit(&self, path: String, source: &'static str) -> OpenFileSubmission {
        let request = OpenFileRequest {
            request_id: self.next_request_id.fetch_add(1, Ordering::Relaxed),
            path,
            source,
        };
        let mut inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        if inner.frontend_ready {
            OpenFileSubmission::Ready(request)
        } else {
            let request_id = request.request_id;
            inner.pending.push_back(request);
            OpenFileSubmission::Queued {
                request_id,
                queue_size: inner.pending.len(),
            }
        }
    }

    fn mark_frontend_ready(&self) -> (bool, Vec<OpenFileRequest>) {
        let mut inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        let was_ready = inner.frontend_ready;
        inner.frontend_ready = true;
        (was_ready, inner.pending.drain(..).collect())
    }

    fn prune_expired(inner: &mut OpenFileCoordinatorInner, now: Instant) -> Vec<InFlightEviction> {
        let expired_ids: Vec<u64> = inner
            .in_flight
            .iter()
            .filter_map(|(request_id, in_flight)| {
                (now.saturating_duration_since(in_flight.emitted_at) >= IN_FLIGHT_TTL)
                    .then_some(*request_id)
            })
            .collect();

        expired_ids
            .into_iter()
            .filter_map(|request_id| {
                inner
                    .in_flight
                    .remove(&request_id)
                    .map(|in_flight| InFlightEviction {
                        request: in_flight.request,
                        reason: InFlightEvictionReason::Timeout,
                    })
            })
            .collect()
    }

    fn track_in_flight(&self, request: OpenFileRequest) -> Vec<InFlightEviction> {
        self.track_in_flight_at(request, Instant::now())
    }

    fn track_in_flight_at(&self, request: OpenFileRequest, now: Instant) -> Vec<InFlightEviction> {
        let mut inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        let mut evictions = Self::prune_expired(&mut inner, now);

        while inner.in_flight.len() >= MAX_IN_FLIGHT_REQUESTS {
            let Some(oldest_id) = inner
                .in_flight
                .iter()
                .min_by_key(|(_, in_flight)| in_flight.emitted_at)
                .map(|(request_id, _)| *request_id)
            else {
                break;
            };
            if let Some(in_flight) = inner.in_flight.remove(&oldest_id) {
                evictions.push(InFlightEviction {
                    request: in_flight.request,
                    reason: InFlightEvictionReason::Capacity,
                });
            }
        }

        inner.in_flight.insert(
            request.request_id,
            InFlightOpenFile {
                request,
                emitted_at: now,
            },
        );
        evictions
    }

    fn acknowledge(&self, request_id: u64) -> (Option<OpenFileRequest>, Vec<InFlightEviction>) {
        self.acknowledge_at(request_id, Instant::now())
    }

    fn acknowledge_at(
        &self,
        request_id: u64,
        now: Instant,
    ) -> (Option<OpenFileRequest>, Vec<InFlightEviction>) {
        let mut inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        let evictions = Self::prune_expired(&mut inner, now);
        let acknowledged = inner
            .in_flight
            .remove(&request_id)
            .map(|in_flight| in_flight.request);
        (acknowledged, evictions)
    }
}

#[tauri::command]
async fn open_supported_file(app: tauri::AppHandle) -> Result<Option<(String, String)>, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("All supported", &["md", "markdown", "mdx", "json"])
        .add_filter("Markdown", &["md", "markdown", "mdx"])
        .add_filter("JSON", &["json"])
        .add_filter("All files", &["*"])
        .blocking_pick_file();

    match file {
        Some(path) => {
            let path_str = path.to_string();
            let content = std::fs::read_to_string(&path_str)
                .map_err(|e| format!("Failed to read file: {}", e))?;
            Ok(Some((path_str, content)))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
async fn save_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
async fn save_file_as(
    app: tauri::AppHandle,
    content: String,
    default_name: String,
    extension: String,
) -> Result<Option<String>, String> {
    // 依當前文件類型，預設選取對應的副檔名過濾器（置於首位即為預設）
    let (type_label, type_exts): (&str, Vec<&str>) = if extension == "json" {
        ("JSON", vec!["json"])
    } else {
        ("Markdown", vec!["md", "markdown", "mdx"])
    };

    let file = app
        .dialog()
        .file()
        .add_filter(type_label, &type_exts)
        .add_filter("All supported", &["md", "markdown", "mdx", "json"])
        .add_filter("All files", &["*"])
        .set_file_name(&default_name)
        .blocking_save_file();

    match file {
        Some(path) => {
            let path_str = path.to_string();
            std::fs::write(&path_str, content)
                .map_err(|e| format!("Failed to write file: {}", e))?;
            Ok(Some(path_str))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn save_html_file(
    app: tauri::AppHandle,
    content: String,
    default_name: String,
) -> Result<Option<String>, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("HTML", &["html"])
        .set_file_name(&default_name)
        .blocking_save_file();

    match file {
        Some(path) => {
            let path_str = path.to_string();
            std::fs::write(&path_str, content)
                .map_err(|e| format!("Failed to write HTML file: {}", e))?;
            Ok(Some(path_str))
        }
        None => Ok(None),
    }
}

fn emit_open_file(
    handle: &tauri::AppHandle,
    coordinator: &OpenFileCoordinator,
    request: OpenFileRequest,
) {
    let content = match std::fs::read_to_string(&request.path) {
        Ok(content) => content,
        Err(error) => {
            log::error!(
                "OPEN_FILE_READ_FAILED id={} source={} path={:?} error={}",
                request.request_id,
                request.source,
                request.path,
                error
            );
            return;
        }
    };

    let Some(window) = handle.get_webview_window("main") else {
        log::error!(
            "OPEN_WINDOW_NOT_FOUND id={} source={} path={:?}",
            request.request_id,
            request.source,
            request.path
        );
        return;
    };

    reveal_main_window(&window);
    log_in_flight_evictions(coordinator.track_in_flight(request.clone()));
    let payload = OpenFilePayload {
        request_id: request.request_id,
        path: request.path.clone(),
        content,
        source: request.source,
    };
    match window.emit("open-file", payload) {
        Ok(()) => log::info!(
            "OPEN_EVENT_EMITTED id={} source={} path={:?}",
            request.request_id,
            request.source,
            request.path
        ),
        Err(error) => {
            let (_, evictions) = coordinator.acknowledge(request.request_id);
            log_in_flight_evictions(evictions);
            log::error!(
                "OPEN_EVENT_EMIT_FAILED id={} source={} path={:?} error={}",
                request.request_id,
                request.source,
                request.path,
                error
            );
        }
    }
}

fn log_in_flight_evictions(evictions: Vec<InFlightEviction>) {
    for eviction in evictions {
        log::warn!(
            "OPEN_FILE_IN_FLIGHT_EVICTED id={} source={} reason={} path={:?}",
            eviction.request.request_id,
            eviction.request.source,
            eviction.reason.as_str(),
            eviction.request.path
        );
    }
}

fn sanitize_log_detail(detail: Option<String>) -> String {
    let flattened = detail.unwrap_or_default().replace(['\r', '\n'], " ");
    let truncated: String = flattened.chars().take(500).collect();
    if truncated.is_empty() {
        "-".to_string()
    } else {
        truncated
    }
}

fn submit_open_file(handle: &tauri::AppHandle, path: String, source: &'static str) {
    let coordinator = handle.state::<OpenFileCoordinator>();
    log::info!("OPEN_REQUEST_RECEIVED source={} path={:?}", source, path);
    match coordinator.submit(path, source) {
        OpenFileSubmission::Queued {
            request_id,
            queue_size,
        } => log::info!(
            "OPEN_REQUEST_QUEUED id={} source={} queue_size={}",
            request_id,
            source,
            queue_size
        ),
        OpenFileSubmission::Ready(request) => emit_open_file(handle, &coordinator, request),
    }
}

#[tauri::command]
fn frontend_ready(app: tauri::AppHandle, coordinator: State<'_, OpenFileCoordinator>) -> usize {
    let (was_ready, pending) = coordinator.mark_frontend_ready();
    log::info!(
        "FRONTEND_READY duplicate={} pending={}",
        was_ready,
        pending.len()
    );
    let pending_count = pending.len();
    for request in pending {
        emit_open_file(&app, &coordinator, request);
    }
    pending_count
}

#[tauri::command]
fn acknowledge_open_file(
    coordinator: State<'_, OpenFileCoordinator>,
    request_id: u64,
    outcome: String,
    detail: Option<String>,
) {
    let detail = sanitize_log_detail(detail);
    let (acknowledged, evictions) = coordinator.acknowledge(request_id);
    log_in_flight_evictions(evictions);
    match acknowledged {
        Some(request) => log::info!(
            "OPEN_FILE_ACKNOWLEDGED id={} source={} outcome={} detail={:?} path={:?}",
            request_id,
            request.source,
            outcome,
            detail,
            request.path
        ),
        None => log::warn!(
            "OPEN_FILE_ACK_UNKNOWN id={} outcome={} detail={:?}",
            request_id,
            outcome,
            detail
        ),
    }
}

fn reveal_main_window(window: &tauri::WebviewWindow) {
    let _ = window.show();
    if window.is_minimized().unwrap_or(false) {
        let _ = window.unminimize();
    }
    let _ = window.set_focus();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // 第二個實例啟動時，把路徑傳給已開啟的視窗
            if let Some(path) = args.get(1) {
                submit_open_file(app, path.clone(), "second_instance");
            } else {
                // 沒有路徑，只聚焦已開啟的視窗
                if let Some(window) = app.get_webview_window("main") {
                    reveal_main_window(&window);
                }
            }
        }))
        .plugin(
            tauri_plugin_log::Builder::new()
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .build(),
        )
        .manage(OpenFileCoordinator::default())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            open_supported_file,
            read_file,
            save_file,
            save_file_as,
            save_html_file,
            frontend_ready,
            acknowledge_open_file,
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if !window.is_maximized().unwrap_or(false) {
                    let _ = window.center();
                }
                reveal_main_window(&window);
            }
            let args: Vec<String> = std::env::args().collect();
            if let Some(path) = args.get(1) {
                submit_open_file(app.handle(), path.clone(), "cold_start");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        sync::{mpsc, Arc, Barrier},
        thread,
    };

    #[test]
    fn open_requests_wait_until_frontend_is_ready() {
        let coordinator = OpenFileCoordinator::default();

        let submission = coordinator.submit("first.md".into(), "cold_start");
        assert!(matches!(
            submission,
            OpenFileSubmission::Queued {
                request_id: 1,
                queue_size: 1
            }
        ));

        let (was_ready, pending) = coordinator.mark_frontend_ready();
        assert!(!was_ready);
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].request_id, 1);
        assert_eq!(pending[0].path, "first.md");
    }

    #[test]
    fn open_requests_are_ready_for_immediate_emit_after_handshake() {
        let coordinator = OpenFileCoordinator::default();
        coordinator.mark_frontend_ready();

        let submission = coordinator.submit("second.json".into(), "second_instance");
        match submission {
            OpenFileSubmission::Ready(request) => {
                assert_eq!(request.request_id, 1);
                assert_eq!(request.path, "second.json");
                assert_eq!(request.source, "second_instance");
            }
            OpenFileSubmission::Queued { .. } => panic!("request should be ready to emit"),
        }
    }

    #[test]
    fn frontend_ready_drains_pending_requests_only_once() {
        let coordinator = OpenFileCoordinator::default();
        coordinator.submit("first.md".into(), "cold_start");
        coordinator.submit("second.md".into(), "second_instance");

        let (_, first_drain) = coordinator.mark_frontend_ready();
        let (was_ready, second_drain) = coordinator.mark_frontend_ready();

        assert_eq!(first_drain.len(), 2);
        assert!(was_ready);
        assert!(second_drain.is_empty());
    }

    #[test]
    fn acknowledgement_removes_the_matching_in_flight_request() {
        let coordinator = OpenFileCoordinator::default();
        let request = OpenFileRequest {
            request_id: 7,
            path: "tracked.md".into(),
            source: "cold_start",
        };
        assert!(coordinator.track_in_flight(request).is_empty());

        let (acknowledged, evictions) = coordinator.acknowledge(7);
        assert!(evictions.is_empty());
        let acknowledged = acknowledged.expect("request should exist");
        assert_eq!(acknowledged.path, "tracked.md");
        assert!(coordinator.acknowledge(7).0.is_none());
    }

    #[test]
    fn in_flight_requests_expire_after_ttl() {
        let coordinator = OpenFileCoordinator::default();
        let emitted_at = Instant::now();
        coordinator.track_in_flight_at(
            OpenFileRequest {
                request_id: 11,
                path: "expired.md".into(),
                source: "cold_start",
            },
            emitted_at,
        );

        let (acknowledged, evictions) = coordinator.acknowledge_at(999, emitted_at + IN_FLIGHT_TTL);

        assert!(acknowledged.is_none());
        assert_eq!(evictions.len(), 1);
        assert_eq!(evictions[0].request.request_id, 11);
        assert_eq!(evictions[0].reason, InFlightEvictionReason::Timeout);
    }

    #[test]
    fn in_flight_requests_evict_oldest_at_capacity() {
        let coordinator = OpenFileCoordinator::default();
        let emitted_at = Instant::now();
        for request_id in 1..=MAX_IN_FLIGHT_REQUESTS as u64 {
            let evictions = coordinator.track_in_flight_at(
                OpenFileRequest {
                    request_id,
                    path: format!("{request_id}.md"),
                    source: "second_instance",
                },
                emitted_at + Duration::from_millis(request_id),
            );
            assert!(evictions.is_empty());
        }

        let evictions = coordinator.track_in_flight_at(
            OpenFileRequest {
                request_id: 999,
                path: "newest.md".into(),
                source: "second_instance",
            },
            emitted_at + Duration::from_secs(1),
        );

        assert_eq!(evictions.len(), 1);
        assert_eq!(evictions[0].request.request_id, 1);
        assert_eq!(evictions[0].reason, InFlightEvictionReason::Capacity);
    }

    #[test]
    fn concurrent_submit_and_ready_never_loses_or_duplicates_requests() {
        const REQUEST_COUNT: usize = 64;
        let coordinator = Arc::new(OpenFileCoordinator::default());
        let barrier = Arc::new(Barrier::new(REQUEST_COUNT + 1));
        let (sender, receiver) = mpsc::channel();
        let mut handles = Vec::new();

        for index in 0..REQUEST_COUNT {
            let coordinator = Arc::clone(&coordinator);
            let barrier = Arc::clone(&barrier);
            let sender = sender.clone();
            handles.push(thread::spawn(move || {
                barrier.wait();
                if let OpenFileSubmission::Ready(request) =
                    coordinator.submit(format!("concurrent-{index}.md"), "second_instance")
                {
                    sender.send(request.request_id).unwrap();
                }
            }));
        }

        barrier.wait();
        let (_, pending) = coordinator.mark_frontend_ready();
        for request in pending {
            sender.send(request.request_id).unwrap();
        }
        drop(sender);
        for handle in handles {
            handle.join().unwrap();
        }

        let mut request_ids: Vec<u64> = receiver.into_iter().collect();
        request_ids.sort_unstable();
        request_ids.dedup();
        assert_eq!(request_ids.len(), REQUEST_COUNT);
    }
}
