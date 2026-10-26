import { useState } from 'react';
import ScriptEditor from './ScriptEditor';
import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';

const TABS = ['Tables', 'Procedures', 'Functions', 'Views', 'Triggers', 'Types', 'Schemas'];

export default function DatabaseTab({ connection }) {
    const [active, setActive] = useState('Tables');
    const [selectedItem, setSelectedItem] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    async function loadItems(tab) {
        if (!connection) {
            setItems([]);
            return;
        }
        setLoading(true);
        setItems([]);
        setSelectedItem(null);
        try {
            const list = await invoke('get_sql_objects', {
                req: { config: connection, objectType: tab }
            });
            setItems(list);
        } catch (err) {
            console.error(err);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }

    function handleTabChange(tab) {
        setActive(tab);
        loadItems(tab);
    }

    useEffect(() => {
        loadItems(active);
    }, [connection]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
                {TABS.map(tab => (
                    <button key={tab} onClick={() => handleTabChange(tab)}
                        style={{
                            padding: '6px 12px',
                            background: active === tab ? '#e8e8e8' : 'transparent',
                            border: 'none',
                            borderBottom: active === tab ? '2px solid #0078d4' : '2px solid transparent',
                            cursor: 'pointer'
                        }}>
                        {tab}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ width: '250px', borderRight: '1px solid #ccc', overflow: 'auto', padding: '4px' }}>
                    {loading && <p>Loading...</p>}
                    {!loading && items.length === 0 && (
                        <p style={{ color: '#888', fontSize: '12px', padding: '8px' }}>
                            No items (backend not connected yet)
                        </p>
                    )}
                    {items.map(item => (
                        <div key={item} onClick={() => setSelectedItem(item)}
                            style={{
                                padding: '4px 8px', cursor: 'pointer',
                                background: selectedItem === item ? '#e0f0ff' : 'transparent'
                            }}>
                            {item}
                        </div>
                    ))}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '4px', borderBottom: '1px solid #eee', display: 'flex', gap: '4px' }}>
                        <button disabled={!selectedItem}>Save</button>
                        <button disabled={!selectedItem}>Cancel</button>
                        <button disabled={!selectedItem}>Undo</button>
                        <button disabled={!selectedItem}>Redo</button>
                    </div>
                    <div style={{ flex: 1 }}>
                        {selectedItem ? (
                            <ScriptEditor item={selectedItem} connection={connection} />
                        ) : (
                            <p style={{ padding: '16px', color: '#888' }}>Select an item to view its script</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}