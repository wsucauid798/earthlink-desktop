use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// User-scoped config file path: ~/.earthlink/config.json
fn config_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".earthlink").join("config.json")
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn load_config() -> String {
    let path = config_path();
    fs::read_to_string(&path).unwrap_or_else(|_| "{}".to_string())
}

#[tauri::command]
fn save_config(json: String) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, json).map_err(|e| e.to_string())
}

/// Bundled default config — shipped inside the app bundle as a resource.
/// Returns "{}" if missing (dev runs without the resource resolved, for example).
#[tauri::command]
fn load_bundled_config(app: tauri::AppHandle) -> String {
    app.path()
        .resolve("resources/default-config.json", tauri::path::BaseDirectory::Resource)
        .ok()
        .and_then(|p| fs::read_to_string(p).ok())
        .unwrap_or_else(|| "{}".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Registered first so it captures the other plugins' startup logs.
        // Unifies Rust + JS logging into: stdout (dev), the webview console
        // (devtools), and a rotating file in the OS log dir ($APPLOG) for
        // post-hoc diagnostics on user machines.
        .plugin(
            tauri_plugin_log::Builder::new()
                // Debug in dev builds, info in release — keeps shipped logs quiet.
                .level(if cfg!(debug_assertions) {
                    log::LevelFilter::Debug
                } else {
                    log::LevelFilter::Info
                })
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Webview,
                ))
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("earthlink".into()),
                    },
                ))
                .max_file_size(5_000_000) // ~5 MB per file before rotating
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Desktop-only plugins (window-state/updater/process are not built
            // for mobile — see the cfg-gated deps in Cargo.toml).
            #[cfg(desktop)]
            {
                // Remember each window's size, position, and maximized/fullscreen
                // state across launches — saved on close, restored on open.
                app.handle()
                    .plugin(tauri_plugin_window_state::Builder::default().build())?;
                // Self-update from signed GitHub releases. The front-end drives
                // the check/download/install flow (see src/lib/updater.ts).
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                // relaunch()/exit() — used to restart the app after an update.
                app.handle().plugin(tauri_plugin_process::init())?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            load_config,
            save_config,
            load_bundled_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
