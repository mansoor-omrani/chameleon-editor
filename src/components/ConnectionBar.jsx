export default function ConnectionBar({ connections, selected, onSelect }) {
    function displayName(conn, index) {
        if (conn.name && conn.name.trim() && !conn.name.startsWith('__auto__')) {
            return conn.name;
        }
        if (conn.database && conn.database.trim()) {
            return conn.database;
        }
        return `connection-${index + 1}`;
    }

    return (
        <div style={{ padding: '8px', borderBottom: '1px solid #ccc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label>Connection:</label>
            <select
                value={selected?.name || ''}
                onChange={e => {
                    const conn = connections.find(c => c.name === e.target.value);
                    onSelect(conn || null);
                }}
                style={{ minWidth: '200px', padding: '4px' }}
            >
                <option value="">-- Select --</option>
                {connections.map((c, index) => (
                    <option key={c.name} value={c.name}>{displayName(c, index)}</option>
                ))}
            </select>
        </div>
    );
}