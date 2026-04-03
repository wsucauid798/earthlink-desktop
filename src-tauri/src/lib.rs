use std::fs;
use std::path::PathBuf;

/// Config file path: ~/.earthlink/config.json
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, load_config, save_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
