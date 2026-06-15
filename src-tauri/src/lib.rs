use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
async fn open_supported_file(app: tauri::AppHandle) -> Result<Option<(String, String)>, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("Supported documents", &["md", "markdown", "mdx", "json"])
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
    let file = app
        .dialog()
        .file()
        .add_filter("Document", &[&extension])
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

fn emit_open_file(handle: &tauri::AppHandle, path: String) {
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Some(window) = handle.get_webview_window("main") {
            reveal_main_window(&window);
            let _ = window.emit("open-file", (path, content));
        }
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
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // 第二個實例啟動時，把路徑傳給已開啟的視窗
            if let Some(path) = args.get(1) {
                emit_open_file(app, path.clone());
            } else {
                // 沒有路徑，只聚焦已開啟的視窗
                if let Some(window) = app.get_webview_window("main") {
                    reveal_main_window(&window);
                }
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            open_supported_file,
            read_file,
            save_file,
            save_file_as,
            save_html_file,
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
                let path = path.clone();
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    emit_open_file(&handle, path);
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
