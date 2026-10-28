import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Editor from '@monaco-editor/react';
import Toast from './Toast';

function splitFullName(fullName) {
    const idx = fullName.indexOf('.');
    if (idx === -1) return { schema: 'dbo', name: fullName };
    return { schema: fullName.slice(0, idx), name: fullName.slice(idx + 1) };
}

export default function ProceduresTab({ connection }) {
    const [procedures, setProcedures] = useState([]);
    const [selectedProc, setSelectedProc] = useState(null);
    const [source, setSource] = useState('');
    const [originalSource, setOriginalSource] = useState('');
    const [loadingList, setLoadingList] = useState(false);
    const [loadingSource, setLoadingSource] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [listWidth, setListWidth] = useState(220);
    const draggingRef = useRef(false);
    const containerRef = useRef(null);
    const editorRef = useRef(null);
    const sourceCache = useRef(new Map());

    useEffect(() => {
        if (!connection) {
            setProcedures([]);
            setSelectedProc(null);
            setSource('');
            sourceCache.current.clear();
            return;
        }
        sourceCache.current.clear();
        setLoadingList(true);
        setError(null);
        invoke('get_sql_objects', {
            req: { config: connection, objectType: 'Procedures' }
        })
            .then(list => setProcedures(list))
            .catch(err => setError(String(err)))
            .finally(() => setLoadingList(false));
    }, [connection]);

    useEffect(() => {
        if (!connection || !selectedProc) {
            setSource('');
            setOriginalSource('');
            return;
        }
        const { schema, name } = splitFullName(selectedProc);
        const key = `${schema}.${name}`;
        if (sourceCache.current.has(key)) {
            const cached = sourceCache.current.get(key);
            setSource(cached);
            setOriginalSource(cached);
            return;
        }
        setLoadingSource(true);
        setError(null);
        invoke('get_procedure_definition', { schema, name })
            .then(def => {
                sourceCache.current.set(key, def);
                setSource(def);
                setOriginalSource(def);
            })
            .catch(err => setError(String(err)))
            .finally(() => setLoadingSource(false));
    }, [connection, selectedProc]);

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

    async function handleSave() {
        if (!selectedProc) return;
        setSaving(true);
        setError(null);
        try {
            await invoke('save_procedure', { sql: source });
            setOriginalSource(source);
            const { schema, name } = splitFullName(selectedProc);
            sourceCache.current.set(`${schema}.${name}`, source);
            setToast({ message: 'ذخیره شد.', type: 'success' });
        } catch (err) {
            setToast({ message: String(err), type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        setSource(originalSource);
        if (editorRef.current) {
            editorRef.current.setValue(originalSource);
        }
        setError(null);
    }

    const dirty = source !== originalSource;

    return (
        <div ref={containerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div className="list-panel" style={{ width: `${listWidth}px`, minWidth: '120px' }}>
                {loadingList && <p style={{ padding: '8px', color: '#888', fontSize: '12px' }}>Loading...</p>}
                {!loadingList && procedures.length === 0 && (
                    <p style={{ padding: '8px', color: '#888', fontSize: '12px' }}>پروسیجری یافت نشد.</p>
                )}
                {procedures.map(p => (
                    <div
                        key={p}
                        onClick={() => setSelectedProc(p)}
                        className={`list-item${selectedProc === p ? ' active' : ''}`}
                    >
                        {p}
                    </div>
                ))}
            </div>

            <div className="splitter" onMouseDown={onMouseDown} title="Drag to resize" />

            <div className="editor-container">
                {error && <p style={{ color: 'red', padding: '4px 8px', margin: 0, fontSize: '12px' }}>{error}</p>}

                {!selectedProc && !error && (
                    <p style={{ padding: '16px', color: '#888' }}>یک پروسیجری را از لیست انتخاب کنید.</p>
                )}

                {selectedProc && (
                    <>
                        <div className="tab-toolbar">
                            <button onClick={handleSave} disabled={!dirty || saving}>
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={handleCancel} disabled={!dirty}>
                                Cancel
                            </button>
                            <button onClick={() => editorRef.current?.trigger('toolbar', 'undo', null)} disabled={!dirty}>
                                Undo
                            </button>
                            <button onClick={() => editorRef.current?.trigger('toolbar', 'redo', null)} disabled={!dirty}>
                                Redo
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            {loadingSource ? (
                                <p style={{ padding: '8px', color: '#888' }}>Loading source...</p>
                            ) : (
                                <Editor
                                    height="100%"
                                    defaultLanguage="sql"
                                    value={source}
                                    onChange={v => setSource(v ?? '')}
                                    onMount={editor => { editorRef.current = editor; }}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        wordWrap: 'on',
                                    }}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}