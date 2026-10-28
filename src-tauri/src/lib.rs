// src-tauri/src/lib.rs
mod commands;
mod types;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello World, {}! (از Rust)", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::test_sql_connection,
            commands::get_sql_objects,
            commands::load_connections,
            commands::save_connections,
            commands::update_connection,
            commands::get_table_columns,
            commands::get_table_data
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
