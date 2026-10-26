use tiberius::{AuthMethod, Client, Config};
use tokio::net::TcpStream;
use tokio_util::compat::TokioAsyncWriteCompatExt;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SqlConnectionConfig {
    name: String,
    server: String,
    database: String,
    userid: String,
    password: String,
    encrypt: bool,
    trust_server_certificate: bool,
    multiple_active_result_sets: bool,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello World, {}! (از Rust)", name)
}

#[tauri::command]
async fn test_sql_connection(config: SqlConnectionConfig) -> Result<String, String> {
    let mut cfg = Config::new();
    cfg.host(&config.server);
    cfg.database(&config.database);
    cfg.authentication(AuthMethod::sql_server(&config.userid, &config.password));

    if config.encrypt {
        cfg.encryption(tiberius::EncryptionLevel::Required);
    } else {
        cfg.encryption(tiberius::EncryptionLevel::NotSupported);
    }

    if config.trust_server_certificate {
        cfg.trust_cert();
    }

    let tcp = TcpStream::connect(cfg.get_addr())
        .await
        .map_err(|e| format!("TCP connection failed: {e}"))?;
    tcp.set_nodelay(true).ok();

    let mut client = Client::connect(cfg, tcp.compat_write())
        .await
        .map_err(|e| format!("SQL Server connection failed: {e}"))?;

    let _ = client
        .simple_query("SELECT 1")
        .await
        .map_err(|e| format!("Query failed: {e}"))?;

    Ok("OK".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, test_sql_connection, get_sql_objects])
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

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct GetObjectsRequest {
    config: SqlConnectionConfig,
    object_type: String,
}

#[tauri::command]
async fn get_sql_objects(req: GetObjectsRequest) -> Result<Vec<String>, String> {
    // ۱. ساخت اتصال (مشابه test_sql_connection)
    let mut cfg = Config::new();
    cfg.host(&req.config.server);
    cfg.database(&req.config.database);
    cfg.authentication(AuthMethod::sql_server(&req.config.userid, &req.config.password));
    if req.config.encrypt {
        cfg.encryption(tiberius::EncryptionLevel::Required);
    } else {
        cfg.encryption(tiberius::EncryptionLevel::NotSupported);
    }
    if req.config.trust_server_certificate {
        cfg.trust_cert();
    }

    let tcp = TcpStream::connect(cfg.get_addr())
        .await
        .map_err(|e| format!("TCP failed: {e}"))?;
    tcp.set_nodelay(true).ok();
    let mut client = Client::connect(cfg, tcp.compat_write())
        .await
        .map_err(|e| format!("SQL connect failed: {e}"))?;

    // ۲. انتخاب کوئری بر اساس نوع
    let query = match req.object_type.as_str() {
        "Tables" => {
            "SELECT s.name + '.' + t.name FROM sys.tables t \
             JOIN sys.schemas s ON t.schema_id = s.schema_id ORDER BY s.name, t.name"
        }
        "Procedures" => {
            "SELECT s.name + '.' + p.name FROM sys.procedures p \
             JOIN sys.schemas s ON p.schema_id = s.schema_id ORDER BY s.name, p.name"
        }
        "Functions" => {
            "SELECT s.name + '.' + o.name FROM sys.objects o \
             JOIN sys.schemas s ON o.schema_id = s.schema_id \
             WHERE o.type IN ('FN','IF','TF','FS','FT') ORDER BY s.name, o.name"
        }
        "Views" => {
            "SELECT s.name + '.' + v.name FROM sys.views v \
             JOIN sys.schemas s ON v.schema_id = s.schema_id ORDER BY s.name, v.name"
        }
        "Triggers" => {
            "SELECT name FROM sys.triggers ORDER BY name"
        }
        "Types" => {
            "SELECT s.name + '.' + t.name FROM sys.types t \
             JOIN sys.schemas s ON t.schema_id = s.schema_id \
             WHERE t.is_user_defined = 1 ORDER BY s.name, t.name"
        }
        "Schemas" => {
            "SELECT name FROM sys.schemas ORDER BY name"
        }
        _ => return Err(format!("Unknown object type: {}", req.object_type)),
    };

    // ۳. اجرای کوئری و جمع‌آوری نتایج
    let stream = client.simple_query(query)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;
    let rows = stream.into_first_result()
        .await
        .map_err(|e| format!("Read failed: {e}"))?;

    let mut result = Vec::new();
    for row in rows {
        // ستون اول را به عنوان String می‌خوانیم
        if let Some(name) = row.get::<&str, _>(0) {
            result.push(name.to_string());
        }
    }
    Ok(result)
}