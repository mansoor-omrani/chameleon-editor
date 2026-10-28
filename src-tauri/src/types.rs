// src-tauri/src/types.rs
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlConnectionConfig {
    pub name: String,
    pub server: String,
    pub database: String,
    pub userid: String,
    pub password: String,
    pub encrypt: bool,
    pub trust_server_certificate: bool,
    pub multiple_active_result_sets: bool,
    pub integrated_security: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SavedConnection {
    pub name: String,
    pub server: String,
    pub database: String,
    pub userid: String,
    pub password: String,
    pub encrypt: bool,
    pub trust_server_certificate: bool,
    pub multiple_active_result_sets: bool,
    pub integrated_security: bool,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetObjectsRequest {
    pub config: SqlConnectionConfig,
    pub object_type: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnInfo {
    pub name: String,
    pub r#type: String,
    pub length: Option<i32>,
    pub is_nullable: bool,
    pub default: Option<String>,
    pub collation: Option<String>,
    pub precision: Option<i32>,
    pub scale: Option<i32>,
    pub is_identity: bool,
    pub formula: Option<String>,
    pub is_persisted: bool,
    pub is_sparse: bool,
    pub description: Option<String>,
}

#[derive(serde::Serialize)]
pub struct TableData {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Option<String>>>,
}
