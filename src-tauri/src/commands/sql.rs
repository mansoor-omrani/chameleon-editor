// src-tauri/src/commands/sql.rs
use crate::SqlPool;
use crate::types::{ColumnInfo, GetObjectsRequest, SqlConnectionConfig, TableData};
use bb8::PooledConnection;
use bb8_tiberius::ConnectionManager;
use tauri::State;
use tiberius::{AuthMethod, Client, Config};
use tokio::net::TcpStream;
use tokio_util::compat::TokioAsyncWriteCompatExt;

fn build_config(config: &SqlConnectionConfig) -> Config {
    let mut cfg = Config::new();
    cfg.host(&config.server);
    cfg.database(&config.database);
    if config.integrated_security {
        cfg.authentication(AuthMethod::windows(&config.userid, &config.password));
    } else {
        cfg.authentication(AuthMethod::sql_server(&config.userid, &config.password));
    }
    if config.encrypt {
        cfg.encryption(tiberius::EncryptionLevel::Required);
    } else {
        cfg.encryption(tiberius::EncryptionLevel::NotSupported);
    }
    if config.trust_server_certificate {
        cfg.trust_cert();
    }
    cfg
}

async fn connect(
    config: &SqlConnectionConfig,
) -> Result<Client<tokio_util::compat::Compat<TcpStream>>, String> {
    let cfg = build_config(config);
    let tcp = TcpStream::connect(cfg.get_addr())
        .await
        .map_err(|e| format!("TCP failed: {e}"))?;
    tcp.set_nodelay(true).ok();
    Client::connect(cfg, tcp.compat_write())
        .await
        .map_err(|e| format!("Connect failed: {e}"))
}

#[tauri::command]
pub async fn test_sql_connection(config: SqlConnectionConfig) -> Result<String, String> {
    let mut client = connect(&config).await?;
    let _ = client
        .simple_query("SELECT 1")
        .await
        .map_err(|e| format!("Query failed: {e}"))?;
    Ok("OK".into())
}

#[tauri::command]
pub async fn get_sql_objects(req: GetObjectsRequest) -> Result<Vec<String>, String> {
    let mut client = connect(&req.config).await?;
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
        "Triggers" => "SELECT name FROM sys.triggers ORDER BY name",
        "Types" => {
            "SELECT s.name + '.' + t.name FROM sys.types t \
             JOIN sys.schemas s ON t.schema_id = s.schema_id \
             WHERE t.is_user_defined = 1 ORDER BY s.name, t.name"
        }
        "Schemas" => "SELECT name FROM sys.schemas ORDER BY name",
        _ => return Err(format!("Unknown object type: {}", req.object_type)),
    };

    let stream = client
        .simple_query(query)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;
    let rows = stream
        .into_first_result()
        .await
        .map_err(|e| format!("Read failed: {e}"))?;

    let mut result = Vec::new();
    for row in rows {
        if let Some(name) = row.get::<&str, _>(0) {
            result.push(name.to_string());
        }
    }
    Ok(result)
}

#[tauri::command]
pub async fn get_table_columns(
    pool_state: State<'_, SqlPool>,
    schema: String,
    table: String,
) -> Result<Vec<ColumnInfo>, String> {
    let mut client = pool_state
        .0
        .get()
        .await
        .map_err(|e| format!("Pool get failed: {e}"))?;
    let full_name = format!(
        "[{}].[{}]",
        schema.replace(']', "]]"),
        table.replace(']', "]]")
    );
    let query = format!(
        r#"
    SELECT
        c.name AS column_name,
        t.name AS type_name,
        c.max_length,
        c.is_nullable,
        dc.definition AS default_def,
        c.collation_name,
        c.precision,
        c.scale,
        c.is_identity,
        cc.definition AS formula,
        cc.is_persisted,
        c.is_sparse,
        CONVERT(nvarchar(max), ep.value) AS description
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
    LEFT JOIN sys.computed_columns cc ON c.object_id = cc.object_id AND c.column_id = cc.column_id
    LEFT JOIN sys.extended_properties ep
        ON ep.major_id = c.object_id AND ep.minor_id = c.column_id AND ep.name = 'MS_Description'
    WHERE c.object_id = OBJECT_ID('{full_name}')
    ORDER BY c.column_id
    "#,
        full_name = full_name.replace('\'', "''")
    );

    let stream = client
        .simple_query(&query)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;
    let rows = stream
        .into_first_result()
        .await
        .map_err(|e| format!("Read failed: {e}"))?;

    let mut result = Vec::new();
    for row in rows {
        result.push(ColumnInfo {
            name: row.get::<&str, _>(0).unwrap_or("").to_string(),
            r#type: row.get::<&str, _>(1).unwrap_or("").to_string(),
            length: row.get::<i16, _>(2).map(|v| v as i32),
            is_nullable: row.get::<bool, _>(3).unwrap_or(false),
            default: row.get::<&str, _>(4).map(|s| s.to_string()),
            collation: row.get::<&str, _>(5).map(|s| s.to_string()),
            precision: row.get::<u8, _>(6).map(|v| v as i32),
            scale: row.get::<u8, _>(7).map(|v| v as i32),
            is_identity: row.get::<bool, _>(8).unwrap_or(false),
            formula: row.get::<&str, _>(9).map(|s| s.to_string()),
            is_persisted: row.get::<bool, _>(10).unwrap_or(false),
            is_sparse: row.get::<bool, _>(11).unwrap_or(false),
            description: row.get::<&str, _>(12).map(|s| s.to_string()),
        });
    }
    Ok(result)
}

#[tauri::command]
pub async fn get_table_data(
    pool_state: State<'_, SqlPool>,
    schema: String,
    table: String,
    limit: i32,
) -> Result<TableData, String> {
    let mut client = pool_state
        .0
        .get()
        .await
        .map_err(|e| format!("Pool get failed: {e}"))?;
    let full_name = format!(
        "[{}].[{}]",
        schema.replace(']', "]]"),
        table.replace(']', "]]")
    );
    let query = format!("SELECT TOP ({}) * FROM {}", limit, full_name);

    let stream = client
        .query(&query, &[])
        .await
        .map_err(|e| format!("Query failed: {e}"))?;

    let mut columns: Vec<String> = Vec::new();
    let mut rows: Vec<Vec<Option<String>>> = Vec::new();

    use futures_util::TryStreamExt;
    use tiberius::QueryItem;
    let mut stream = stream;
    while let Some(item) = stream
        .try_next()
        .await
        .map_err(|e| format!("Read failed: {e}"))?
    {
        match item {
            QueryItem::Metadata(meta) => {
                columns = meta
                    .columns()
                    .iter()
                    .map(|c| c.name().to_string())
                    .collect();
            }
            QueryItem::Row(row) => {
                let mut vals = Vec::new();
                for cell in row.into_iter() {
                    vals.push(column_data_to_string(cell));
                }
                rows.push(vals);
            }
        }
    }

    Ok(TableData { columns, rows })
}

fn column_data_to_string(data: tiberius::ColumnData) -> Option<String> {
    use tiberius::ColumnData;
    use tiberius::time::chrono::{DateTime, FixedOffset, NaiveDate, NaiveTime, Utc};

    match data {
        ColumnData::U8(v) => v.map(|x| x.to_string()),
        ColumnData::I16(v) => v.map(|x| x.to_string()),
        ColumnData::I32(v) => v.map(|x| x.to_string()),
        ColumnData::I64(v) => v.map(|x| x.to_string()),
        ColumnData::F32(v) => v.map(|x| x.to_string()),
        ColumnData::F64(v) => v.map(|x| x.to_string()),
        ColumnData::Bit(v) => v.map(|x| x.to_string()),
        ColumnData::String(v) => v.map(|x| x.to_string()),
        ColumnData::Guid(v) => v.map(|x| x.to_string()),
        ColumnData::Binary(v) => {
            v.map(|x| x.iter().map(|b| format!("{:02X}", b)).collect::<String>())
        }
        ColumnData::Numeric(v) => v.map(|x| x.to_string()),
        ColumnData::Xml(v) => v.map(|x| x.to_string()),

        ColumnData::DateTime(v) => v.map(|dt| {
            let days_since_1900 = dt.days() as i64;
            let secs = dt.seconds_fragments() as i64 / 300;
            let epoch_secs = (days_since_1900 - 25567) * 86400 + secs;
            let naive = DateTime::<Utc>::from_timestamp(epoch_secs, 0)
                .map(|d| d.naive_utc())
                .unwrap_or_default();
            format!("{}", naive.format("%Y-%m-%d %H:%M:%S"))
        }),
        ColumnData::SmallDateTime(v) => v.map(|dt| {
            let days_since_1900 = dt.days() as i64;
            let secs = dt.seconds_fragments() as i64 / 300;
            let epoch_secs = (days_since_1900 - 25567) * 86400 + secs;
            let naive = DateTime::<Utc>::from_timestamp(epoch_secs, 0)
                .map(|d| d.naive_utc())
                .unwrap_or_default();
            format!("{}", naive.format("%Y-%m-%d %H:%M:%S"))
        }),
        ColumnData::Date(v) => v.map(|d| {
            let naive =
                NaiveDate::from_num_days_from_ce_opt((d.days() as i32) + 1).unwrap_or_default();
            format!("{}", naive.format("%Y-%m-%d"))
        }),
        ColumnData::Time(v) => v.map(|t| {
            let scale = t.scale() as u32;
            let increments = t.increments();
            let nanos_per_increment = 10u64.pow(9 - scale);
            let total_nanos = increments * nanos_per_increment;
            let secs = (total_nanos / 1_000_000_000) as u32;
            let nanos = (total_nanos % 1_000_000_000) as u32;
            let naive_time =
                NaiveTime::from_num_seconds_from_midnight_opt(secs, nanos).unwrap_or_default();
            format!("{}", naive_time.format("%H:%M:%S%.f"))
        }),
        ColumnData::DateTime2(v) => v.map(|dt2| {
            let date = dt2.date();
            let time = dt2.time();
            let days_since_epoch = date.days() as i64 - 719162;
            let scale = time.scale() as u32;
            let increments = time.increments();
            let nanos_per_increment = 10u64.pow(9 - scale);
            let total_nanos = increments * nanos_per_increment;
            let secs = (total_nanos / 1_000_000_000) as i64;
            let nanos = (total_nanos % 1_000_000_000) as u32;
            let epoch_secs = days_since_epoch * 86400 + secs;
            let naive = DateTime::<Utc>::from_timestamp(epoch_secs, nanos)
                .map(|d| d.naive_utc())
                .unwrap_or_default();
            format!("{}", naive.format("%Y-%m-%d %H:%M:%S%.f"))
        }),
        ColumnData::DateTimeOffset(v) => v.map(|dto| {
            let dt2 = dto.datetime2();
            let date = dt2.date();
            let time = dt2.time();
            let days_since_epoch = date.days() as i64 - 719162;
            let scale = time.scale() as u32;
            let increments = time.increments();
            let nanos_per_increment = 10u64.pow(9 - scale);
            let total_nanos = increments * nanos_per_increment;
            let secs = (total_nanos / 1_000_000_000) as i64;
            let nanos = (total_nanos % 1_000_000_000) as u32;
            let epoch_secs = days_since_epoch * 86400 + secs;
            let naive = DateTime::<Utc>::from_timestamp(epoch_secs, nanos)
                .map(|d| d.naive_utc())
                .unwrap_or_default();
            let offset_min = dto.offset() as i32;
            let offset = FixedOffset::east_opt(offset_min * 60)
                .unwrap_or_else(|| FixedOffset::east_opt(0).unwrap());
            let dt_with_tz =
                DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc).with_timezone(&offset);
            format!("{}", dt_with_tz.format("%Y-%m-%d %H:%M:%S%.f%:z"))
        }),
    }
}

#[tauri::command]
pub async fn get_procedure_definition(
    pool_state: State<'_, SqlPool>,
    schema: String,
    name: String,
) -> Result<String, String> {
    let mut client = pool_state
        .0
        .get()
        .await
        .map_err(|e| format!("Pool get failed: {e}"))?;
    let full_name = format!(
        "[{}].[{}]",
        schema.replace(']', "]]"),
        name.replace(']', "]]")
    );
    let query = format!(
        "SELECT OBJECT_DEFINITION(OBJECT_ID('{}'))",
        full_name.replace('\'', "''")
    );
    let stream = client
        .simple_query(&query)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;
    let rows = stream
        .into_first_result()
        .await
        .map_err(|e| format!("Read failed: {e}"))?;
    let def = rows
        .first()
        .and_then(|r| r.get::<&str, _>(0))
        .unwrap_or("")
        .to_string();
    // جایگزینی CREATE PROCEDURE با CREATE OR ALTER PROCEDURE
    let upper = def.to_uppercase();
    let recreated = if let Some(pos) = upper.find("CREATE") {
        let after = &def[pos + 6..];
        let after_upper = after.to_uppercase();
        if after_upper.trim_start().starts_with("PROCEDURE")
            || after_upper.trim_start().starts_with("PROC")
        {
            format!("CREATE OR ALTER{}", after)
        } else {
            def.clone()
        }
    } else {
        def.clone()
    };
    Ok(recreated)
}

#[tauri::command]
pub async fn save_procedure(pool_state: State<'_, SqlPool>, sql: String) -> Result<(), String> {
    let mut client = pool_state
        .0
        .get()
        .await
        .map_err(|e| format!("Pool get failed: {e}"))?;
    client
        .simple_query(&sql)
        .await
        .map_err(|e| format!("Save failed: {e}"))?;
    Ok(())
}
