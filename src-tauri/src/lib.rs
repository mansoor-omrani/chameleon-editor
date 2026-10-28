// src-tauri/src/lib.rs
mod commands;
mod types;

use bb8::Pool;
use bb8_tiberius::ConnectionManager;
use tauri::Manager;

pub struct SqlPool(pub Pool<ConnectionManager>);

#[tauri::command]
async fn setup_pool(
    app: tauri::AppHandle,
    config: types::SqlConnectionConfig,
) -> Result<(), String> {
    let mut cfg = tiberius::Config::new();
    cfg.host(&config.server);
    cfg.database(&config.database);
    if config.integrated_security {
        cfg.authentication(tiberius::AuthMethod::windows(
            &config.userid,
            &config.password,
        ));
    } else {
        cfg.authentication(tiberius::AuthMethod::sql_server(
            &config.userid,
            &config.password,
        ));
    }
    if config.encrypt {
        cfg.encryption(tiberius::EncryptionLevel::Required);
    } else {
        cfg.encryption(tiberius::EncryptionLevel::NotSupported);
    }
    if config.trust_server_certificate {
        cfg.trust_cert();
    }

    let manager = ConnectionManager::new(cfg);
    let pool = Pool::builder()
        .max_size(5)
        .build(manager)
        .await
        .map_err(|e| format!("Pool build failed: {e}"))?;

    app.manage(SqlPool(pool));
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello World, {}! (از Rust)", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            setup_pool,
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
