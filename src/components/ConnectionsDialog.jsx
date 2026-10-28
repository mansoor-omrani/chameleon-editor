import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

const emptyForm = {
    name: '', server: '', database: '', userid: '', password: '',
    encrypt: true, trustServerCertificate: true, multipleActiveResultSets: true,
    integratedSecurity: false,
};

function displayName(conn, index) {
    if (!conn) return '';
    if (conn.name && conn.name.trim() && !conn.name.startsWith('__auto__')) {
        return conn.name;
    }
    if (conn.database && conn.database.trim()) {
        return conn.database;
    }
    return `connection-${index + 1}`;
}

export default function ConnectionsDialog({ connections, setConnections, selectedName, onClose }) {
    // اگر selectedName معتبر است، فرم از ابتدا با همان اتصال پر شود
    const initialConn = connections.find(c => c.name === selectedName);

    const [selected, setSelected] = useState(initialConn ? initialConn.name : null);
    const [form, setForm] = useState(() => {
        if (!initialConn) return emptyForm;
        const formName = initialConn.name.startsWith('__auto__') ? '' : initialConn.name;
        return { ...emptyForm, ...initialConn, name: formName };
    });
    const [isNew, setIsNew] = useState(false);
    const [testing, setTesting] = useState(false);
    const [toast, setToast] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    function update(key, value) {
        setForm(prev => {
            const next = { ...prev, [key]: value };
            if (key === 'integratedSecurity' && value === true) {
                next.userid = '';
                next.password = '';
            }
            return next;
        });
    }

    function handleSelect(name) {
        const conn = connections.find(c => c.name === name);
        if (!conn) {
            console.warn('Connection not found:', name, connections);
            return;
        }
        setSelected(name);
        const formName = conn.name.startsWith('__auto__') ? '' : conn.name;
        setForm({ ...emptyForm, ...conn, name: formName });
        setIsNew(false);
    }

    function handleNew() {
        setSelected(null);
        setForm(emptyForm);
        setIsNew(true);
    }

    function validate() {
        if (!form.server.trim()) return 'فیلد Server الزامی است.';
        if (!form.integratedSecurity) {
            if (!form.userid.trim()) return 'فیلد User ID الزامی است.';
            if (!form.password.trim()) return 'فیلد Password الزامی است.';
        }
        return null;
    }

    async function handleTest() {
        const err = validate();
        if (err) {
            setToast({ message: err, type: 'error' });
            return;
        }
        setTesting(true);
        try {
            await invoke('test_sql_connection', { config: form });
            setToast({ message: 'اتصال موفق بود.', type: 'success' });
        } catch (e) {
            setToast({ message: String(e), type: 'error' });
        } finally {
            setTesting(false);
        }
    }

    async function handleSave() {
        const err = validate();
        if (err) {
            setToast({ message: err, type: 'error' });
            return;
        }
        const name = form.name.trim() || `__auto__${Date.now()}`;
        const payload = { ...form, name };
        try {
            if (isNew) {
                const updated = [...connections, payload];
                await invoke('save_connections', { connections: updated });
                setConnections(updated);
                setSelected(name);
                setIsNew(false);
            } else {
                const updated = await invoke('update_connection', {
                    oldName: selected,
                    connection: payload,
                });
                setConnections(updated);
                setSelected(name);
            }
            setToast({ message: 'ذخیره شد.', type: 'success' });
        } catch (e) {
            setToast({ message: String(e), type: 'error' });
        }
    }

    async function handleDelete() {
        if (!selected) return;
        try {
            const updated = connections.filter(c => c.name !== selected);
            await invoke('save_connections', { connections: updated });
            setConnections(updated);
            setSelected(null);
            setForm(emptyForm);
            setIsNew(false);
            setToast({ message: 'حذف شد.', type: 'success' });
        } catch (e) {
            setToast({ message: String(e), type: 'error' });
        } finally {
            setConfirmDelete(false);
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                background: 'white', borderRadius: '8px', width: '720px', maxWidth: '95vw',
                height: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Connections</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: '220px', borderLeft: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                            <button onClick={handleNew} style={{ width: '100%', padding: '6px' }}>+ New</button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '4px' }}>
                            {connections.length === 0 && (
                                <p style={{ color: '#888', fontSize: '12px', padding: '8px' }}>هیچ اتصالی ذخیره نشده است.</p>
                            )}
                            {connections.map((c, index) => (
                                <div
                                    key={c.name}
                                    onClick={() => handleSelect(c.name)}
                                    style={{
                                        padding: '6px 8px', cursor: 'pointer', borderRadius: '4px',
                                        background: selected === c.name ? '#e0f0ff' : 'transparent'
                                    }}
                                >
                                    {displayName(c, index)}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                        {!isNew && !selected && (
                            <p style={{ color: '#888' }}>یک اتصال را انتخاب کنید یا New بزنید.</p>
                        )}

                        {(isNew || selected) && (
                            <>
                                <label style={{ display: 'block', marginBottom: '8px' }}>
                                    Connection Name
                                    <input value={form.name} onChange={e => update('name', e.target.value)}
                                        style={{ display: 'block', width: '100%', padding: '4px' }} />
                                </label>
                                <label style={{ display: 'block', marginBottom: '8px' }}>
                                    Server *
                                    <input value={form.server} onChange={e => update('server', e.target.value)}
                                        style={{ display: 'block', width: '100%', padding: '4px' }} />
                                </label>
                                <label style={{ display: 'block', marginBottom: '8px' }}>
                                    Database
                                    <input value={form.database} onChange={e => update('database', e.target.value)}
                                        style={{ display: 'block', width: '100%', padding: '4px' }} />
                                </label>

                                <label style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                    <input type="checkbox" checked={form.integratedSecurity}
                                        onChange={e => update('integratedSecurity', e.target.checked)} />
                                    Integrated Security
                                </label>

                                <label style={{ display: 'block', marginBottom: '8px' }}>
                                    User ID {!form.integratedSecurity && '*'}
                                    <input value={form.userid} onChange={e => update('userid', e.target.value)}
                                        disabled={form.integratedSecurity}
                                        style={{ display: 'block', width: '100%', padding: '4px' }} />
                                </label>
                                <label style={{ display: 'block', marginBottom: '8px' }}>
                                    Password {!form.integratedSecurity && '*'}
                                    <input type="password" value={form.password} onChange={e => update('password', e.target.value)}
                                        disabled={form.integratedSecurity}
                                        style={{ display: 'block', width: '100%', padding: '4px' }} />
                                </label>

                                <label style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                                    <input type="checkbox" checked={form.encrypt} onChange={e => update('encrypt', e.target.checked)} />
                                    Encrypt
                                </label>
                                <label style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                                    <input type="checkbox" checked={form.trustServerCertificate} onChange={e => update('trustServerCertificate', e.target.checked)} />
                                    Trust Server Certificate
                                </label>
                                <label style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                                    <input type="checkbox" checked={form.multipleActiveResultSets} onChange={e => update('multipleActiveResultSets', e.target.checked)} />
                                    Multiple Active Result Sets
                                </label>

                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    {!isNew && selected && (
                                        <button
                                            onClick={() => setConfirmDelete(true)}
                                            style={{ padding: '6px 12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Delete
                                        </button>
                                    )}
                                    <button onClick={handleTest} disabled={testing}>
                                        {testing ? 'Testing...' : 'Test'}
                                    </button>
                                    <button onClick={handleSave} style={{ background: '#0078d4', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>
                                        Save
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
            {confirmDelete && (
                <ConfirmDialog
                    title="حذف اتصال"
                    message={`آیا از حذف اتصال «${displayName(
                        connections.find(c => c.name === selected) || {},
                        connections.findIndex(c => c.name === selected)
                    )}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`}
                    confirmLabel="حذف"
                    cancelLabel="انصراف"
                    danger
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
        </div>
    );
}