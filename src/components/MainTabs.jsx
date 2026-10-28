import { useState } from 'react';
import TablesTab from './TablesTab';
import ProceduresTab from './ProceduresTab';

const TABS = ['Tables', 'Procedures', 'Functions', 'Views'];

export default function MainTabs({ connection }) {
    const [active, setActive] = useState('Tables');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActive(tab)}
                        style={{
                            padding: '8px 16px',
                            background: active === tab ? '#e0e0e0' : 'transparent',
                            border: 'none',
                            borderBottom: active === tab ? '2px solid #0078d4' : '2px solid transparent',
                            cursor: 'pointer'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {!connection && (
                    <p style={{ padding: '16px', color: '#888' }}>لطفاً ابتدا یک اتصال انتخاب کنید.</p>
                )}
                {connection && active === 'Tables' && <TablesTab connection={connection} />}
                {connection && active === 'Procedures' && <ProceduresTab connection={connection} />}
                {connection && active !== 'Tables' && active !== 'Procedures' && (
                    <p style={{ padding: '16px', color: '#888' }}>
                        محتوای تب <strong>{active}</strong> بعداً پیاده‌سازی می‌شود.
                    </p>
                )}
            </div>
        </div>
    );
}