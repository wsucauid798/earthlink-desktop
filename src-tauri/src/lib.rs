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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            load_config,
            save_config,
            load_bundled_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
