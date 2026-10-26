import { useState } from 'react';
import ConnectionBar from './components/ConnectionBar';
import DatabaseTab from './components/DatabaseTab';
import AppTab from './components/AppTab';

function App() {
  const [activeTab, setActiveTab] = useState('Database');
  const [selectedConnection, setSelectedConnection] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      <ConnectionBar
        selected={selectedConnection}
        onSelect={setSelectedConnection}
      />
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
        {['Database', 'App'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab ? '#e0e0e0' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #0078d4' : '2px solid transparent',
              cursor: 'pointer'
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'Database' && <DatabaseTab connection={selectedConnection} />}
        {activeTab === 'App' && <AppTab />}
      </div>
    </div>
  );
}

export default App;