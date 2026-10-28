// src-tauri/src/commands/connections.rs
use crate::types::SavedConnection;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn connections_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot get app data dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create dir: {e}"))?;
    Ok(dir.join("connections.json"))
}

#[tauri::command]
pub fn load_connections(app: tauri::AppHandle) -> Result<Vec<SavedConnection>, String> {
    let path = connections_file_path(&app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("Read failed: {e}"))?;
    if content.trim().is_empty() {
        return Ok(Vec::new());
    }
    let list: Vec<SavedConnection> =
        serde_json::from_str(&content).map_err(|e| format!("Parse failed: {e}"))?;
    Ok(list)
}

#[tauri::command]
pub fn save_connections(
    app: tauri::AppHandle,
    connections: Vec<SavedConnection>,
) -> Result<(), String> {
    let path = connections_file_path(&app)?;
    let content =
        serde_json::to_string_pretty(&connections).map_err(|e| format!("Serialize failed: {e}"))?;
    fs::write(&path, content).map_err(|e| format!("Write failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn update_connection(
    app: tauri::AppHandle,
    old_name: String,
    connection: SavedConnection,
) -> Result<Vec<SavedConnection>, String> {
    let path = connections_file_path(&app)?;
    let content = fs::read_to_string(&path).unwrap_or_default();
    let mut list: Vec<SavedConnection> = if content.trim().is_empty() {
        Vec::new()
    } else {
        serde_json::from_str(&content).map_err(|e| format!("Parse failed: {e}"))?
    };

    if let Some(pos) = list.iter().position(|c| c.name == old_name) {
        list[pos] = connection;
    } else {
        return Err(format!("Connection '{}' not found", old_name));
    }

    let out = serde_json::to_string_pretty(&list).map_err(|e| format!("Serialize failed: {e}"))?;
    fs::write(&path, out).map_err(|e| format!("Write failed: {e}"))?;
    Ok(list)
}
