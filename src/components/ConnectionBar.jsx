import { useState } from 'react';
import ConnectionDialog from './ConnectionDialog';

export default function ConnectionBar({ selected, onSelect }) {
    const [connections, setConnections] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);

    function handleAdd(conn) {
        setConnections(prev => [...prev, conn]);
        setDialogOpen(false);
    }

    return (
        <div style={{ padding: '8px', borderBottom: '1px solid #ccc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label>Connection:</label>
            <select
                value={selected?.name || ''}
                onChange={e => {
                    if (e.target.value === '__new__') {
                        setDialogOpen(true);
                    } else {
                        const conn = connections.find(c => c.name === e.target.value);
                        onSelect(conn || null);
                    }
                }}
                style={{ minWidth: '200px', padding: '4px' }}
            >
                <option value="">-- Select --</option>
                {connections.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                ))}
                <option value="__new__">+ New Connection...</option>
            </select>

            {dialogOpen && (
                <ConnectionDialog
                    onClose={() => setDialogOpen(false)}
                    onSave={handleAdd}
                />
            )}
        </div>
    );
}