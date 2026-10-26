import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

const empty = {
    name: '',
    server: '',
    database: '',
    userid: '',
    password: '',
    encrypt: true,
    trustServerCertificate: true,
    multipleActiveResultSets: false,
};

export default function ConnectionDialog({ onClose, onSave }) {
    const [form, setForm] = useState(empty);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    function update(key, value) {
        setForm(prev => ({ ...prev, [key]: value }));
    }

    async function handleTest() {
        setTesting(true);
        setTestResult(null);
        try {
            await invoke('test_sql_connection', { config: form });
            setTestResult({ ok: true, message: 'اتصال موفق بود.' });
        } catch (err) {
            setTestResult({ ok: false, message: String(err) });
        } finally {
            setTesting(false);
        }
    }

    function handleSave() {
        if (!form.name.trim()) {
            setTestResult({ ok: false, message: 'نام اتصال الزامی است.' });
            return;
        }
        onSave(form);
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', minWidth: '400px', maxWidth: '90vw' }}>
                <h3 style={{ marginTop: 0 }}>New Connection</h3>

                <label style={{ display: 'block', marginBottom: '8px' }}>
                    Connection Name
                    <input value={form.name} onChange={e => update('name', e.target.value)}
                        style={{ display: 'block', width: '100%', padding: '4px' }} />
                </label>

                <label style={{ display: 'block', marginBottom: '8px' }}>
                    Server
                    <input value={form.server} onChange={e => update('server', e.target.value)}
                        placeholder="localhost" style={{ display: 'block', width: '100%', padding: '4px' }} />
                </label>

                <label style={{ display: 'block', marginBottom: '8px' }}>
                    Database
                    <input value={form.database} onChange={e => update('database', e.target.value)}
                        style={{ display: 'block', width: '100%', padding: '4px' }} />
                </label>

                <label style={{ display: 'block', marginBottom: '8px' }}>
                    User ID
                    <input value={form.userid} onChange={e => update('userid', e.target.value)}
                        style={{ display: 'block', width: '100%', padding: '4px' }} />
                </label>

                <label style={{ display: 'block', marginBottom: '8px' }}>
                    Password
                    <input type="password" value={form.password} onChange={e => update('password', e.target.value)}
                        style={{ display: 'block', width: '100%', padding: '4px' }} />
                </label>

                <label style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                    <input type="checkbox" checked={form.encrypt}
                        onChange={e => update('encrypt', e.target.checked)} />
                    Encrypt
                </label>

                <label style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                    <input type="checkbox" checked={form.trustServerCertificate}
                        onChange={e => update('trustServerCertificate', e.target.checked)} />
                    Trust Server Certificate
                </label>

                <label style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    <input type="checkbox" checked={form.multipleActiveResultSets}
                        onChange={e => update('multipleActiveResultSets', e.target.checked)} />
                    Multiple Active Result Sets
                </label>

                {testResult && (
                    <p style={{ color: testResult.ok ? 'green' : 'red', margin: '8px 0' }}>
                        {testResult.message}
                    </p>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={handleTest} disabled={testing}>
                        {testing ? 'Testing...' : 'Test'}
                    </button>
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={handleSave} style={{ background: '#0078d4', color: 'white', border: 'none', padding: '6px 12px' }}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}