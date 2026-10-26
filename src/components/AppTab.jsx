const TABS = ['Controller/Actions', 'Views', 'Files', 'Routes', 'Configs'];

export default function AppTab() {
    return (
        <div style={{ padding: '16px' }}>
            <p style={{ color: '#888' }}>App tab is under construction.</p>
            <ul>
                {TABS.map(t => <li key={t}>{t}</li>)}
            </ul>
        </div>
    );
}