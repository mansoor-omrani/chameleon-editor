import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

const COLUMN_HEADERS = [
    'Name', 'Type', 'Length', 'Is Nullable', 'Default', 'Collation',
    'Precision', 'Scale', 'Is Identity', 'Formula', 'Is Persisted', 'Is Sparse', 'Description'
];

function splitFullName(fullName) {
    const idx = fullName.indexOf('.');
    if (idx === -1) return { schema: 'dbo', table: fullName };
    return { schema: fullName.slice(0, idx), table: fullName.slice(idx + 1) };
}

export default function TablesTab({ connection }) {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [columns, setColumns] = useState([]);
    const [data, setData] = useState(null);
    const [loadingTables, setLoadingTables] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [error, setError] = useState(null);
    const [listWidth, setListWidth] = useState(220);
    const draggingRef = useRef(false);
    const containerRef = useRef(null);
    const columnsCache = useRef(new Map());

    useEffect(() => {
        if (!connection) {
            setTables([]);
            setSelectedTable(null);
            setColumns([]);
            setData(null);
            columnsCache.current.clear();
            return;
        }
        columnsCache.current.clear();
        setLoadingTables(true);
        setError(null);
        invoke('get_sql_objects', {
            req: { config: connection, objectType: 'Tables' }
        })
            .then(list => setTables(list))
            .catch(err => setError(String(err)))
            .finally(() => setLoadingTables(false));
    }, [connection]);

    async function loadColumns(schema, table, force = false) {
        const key = `${schema}.${table}`;
        if (!force && columnsCache.current.has(key)) {
            setColumns(columnsCache.current.get(key));
            return;
        }
        const cols = await invoke('get_table_columns', { config: connection, schema, table });
        columnsCache.current.set(key, cols);
        setColumns(cols);
    }

    useEffect(() => {
        if (!connection || !selectedTable) {
            setColumns([]);
            setData(null);
            return;
        }
        const { schema, table } = splitFullName(selectedTable);
        setLoadingDetails(true);
        setError(null);
        Promise.all([
            loadColumns(schema, table, false),
            invoke('get_table_data', { config: connection, schema, table, limit: 100 })
        ])
            .then(([, d]) => setData(d))
            .catch(err => setError(String(err)))
            .finally(() => setLoadingDetails(false));
    }, [connection, selectedTable]);

    async function refreshColumns() {
        if (!selectedTable) return;
        const { schema, table } = splitFullName(selectedTable);
        setLoadingDetails(true);
        setError(null);
        try {
            await loadColumns(schema, table, true);
        } catch (err) {
            setError(String(err));
        } finally {
            setLoadingDetails(false);
        }
    }

    const onMouseDown = useCallback((e) => {
        e.preventDefault();
        draggingRef.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        function onMouseMove(e) {
            if (!draggingRef.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            let newWidth = e.clientX - rect.left;
            newWidth = Math.max(120, Math.min(newWidth, rect.width - 200));
            setListWidth(newWidth);
        }
        function onMouseUp() {
            if (!draggingRef.current) return;
            draggingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    return (
        <div ref={containerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div style={{ width: `${listWidth}px`, minWidth: '120px', borderRight: '1px solid #ccc', overflow: 'auto', padding: '4px' }}>
                {loadingTables && <p style={{ padding: '8px', color: '#888' }}>Loading...</p>}
                {!loadingTables && tables.length === 0 && (
                    <p style={{ padding: '8px', color: '#888', fontSize: '12px' }}>جدولی یافت نشد.</p>
                )}
                {tables.map(t => (
                    <div
                        key={t}
                        onClick={() => setSelectedTable(t)}
                        style={{
                            padding: '4px 8px', cursor: 'pointer', borderRadius: '4px',
                            background: selectedTable === t ? '#e0f0ff' : 'transparent'
                        }}
                    >
                        {t}
                    </div>
                ))}
            </div>

            <div
                onMouseDown={onMouseDown}
                style={{ width: '5px', cursor: 'col-resize', background: '#e0e0e0', flexShrink: 0 }}
                title="Drag to resize"
            />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {error && (
                    <p style={{ color: 'red', padding: '8px', margin: 0 }}>{error}</p>
                )}

                {!selectedTable && !error && (
                    <p style={{ padding: '16px', color: '#888' }}>یک جدول را از لیست انتخاب کنید.</p>
                )}

                {selectedTable && (
                    <>
                        <div style={{ flex: '0 0 40%', position: 'relative', overflow: 'hidden', borderBottom: '1px solid #ccc' }}>
                            <div style={{ height: '100%', overflow: 'auto' }}>
                                {loadingDetails ? (
                                    <p style={{ padding: '8px', color: '#888' }}>Loading columns...</p>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5' }}>
                                            <tr>
                                                {COLUMN_HEADERS.map(h => (
                                                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc', whiteSpace: 'nowrap' }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {columns.map(col => (
                                                <tr key={col.name}>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.name}</td>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.type}</td>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.length ?? ''}</td>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.isNullable ? '✓' : ''}</td>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.default ?? ''}</td>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.collation ?? ''}</td>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.precision ?? ''}</td>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.scale ?? ''}</td>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.isIdentity ? '✓' : ''}</td>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.formula ?? ''}</td>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.isPersisted ? '✓' : ''}</td>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.isSparse ? '✓' : ''}</td>
                                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{col.description ?? ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <button
                                onClick={refreshColumns}
                                disabled={loadingDetails}
                                title="Refresh columns"
                                style={{
                                    position: 'absolute',
                                    bottom: '14px',
                                    right: '4px',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    border: '1px solid #ccc',
                                    background: 'white',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                    fontSize: '14px',
                                    zIndex: 5,
                                }}
                            >
                                ⟳
                            </button>
                        </div>

                        <div style={{ flex: 1, overflow: 'auto' }}>
                            {loadingDetails ? (
                                <p style={{ padding: '8px', color: '#888' }}>Loading data...</p>
                            ) : data && data.columns.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5' }}>
                                        <tr>
                                            {data.columns.map((c, i) => (
                                                <th key={i} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc', whiteSpace: 'nowrap' }}>
                                                    {c}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.rows.map((row, ri) => (
                                            <tr key={ri}>
                                                {row.map((cell, ci) => (
                                                    <td key={ci} style={{ padding: '4px 8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>
                                                        {cell ?? <span style={{ color: '#aaa' }}>NULL</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p style={{ padding: '8px', color: '#888' }}>داده‌ای برای نمایش نیست.</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}