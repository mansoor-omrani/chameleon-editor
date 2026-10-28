import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ConnectionBar from './components/ConnectionBar';
import MainTabs from './components/MainTabs';
import ConnectionsDialog from './components/ConnectionsDialog';
import AboutDialog from './components/AboutDialog';

function App() {
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [connectionsDialogOpen, setConnectionsDialogOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    invoke('load_connections')
      .then(list => {
        setConnections(list);
        if (list.length > 0) setSelectedConnection(list[0]);
      })
      .catch(err => console.error('Load connections failed:', err))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    invoke('save_connections', { connections }).catch(err =>
      console.error('Save connections failed:', err)
    );
  }, [connections, loaded]);

  useEffect(() => {
    if (selectedConnection) {
      invoke('setup_pool', { config: selectedConnection })
        .catch(err => console.error('Pool setup failed:', err));
    }
  }, [selectedConnection]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Menu bar — بدون تغییر */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc', background: '#f5f5f5', padding: '0 4px' }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setOptionsOpen(o => !o); setHelpOpen(false); }}
            style={{ padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Options
          </button>
          {optionsOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, background: 'white',
              border: '1px solid #ccc', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 100
            }}>
              <button
                onClick={() => { setOptionsOpen(false); setConnectionsDialogOpen(true); }}
                style={{ display: 'block', width: '100%', padding: '6px 16px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
              >
                Connections...
              </button>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setHelpOpen(o => !o); setOptionsOpen(false); }}
            style={{ padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Help
          </button>
          {helpOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, background: 'white',
              border: '1px solid #ccc', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 100
            }}>
              <button
                onClick={() => { setHelpOpen(false); setAboutDialogOpen(true); }}
                style={{ display: 'block', width: '100%', padding: '6px 16px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
              >
                About
              </button>
            </div>
          )}
        </div>
      </div>

      <ConnectionBar
        connections={connections}
        selected={selectedConnection}
        onSelect={setSelectedConnection}
      />

      {/* نوار تب ساده‌شده */}
      <MainTabs connection={selectedConnection} />

      {connectionsDialogOpen && (
        <ConnectionsDialog
          connections={connections}
          setConnections={setConnections}
          selectedName={selectedConnection?.name || null}
          onClose={() => setConnectionsDialogOpen(false)}
        />
      )}
      {aboutDialogOpen && (
        <AboutDialog onClose={() => setAboutDialogOpen(false)} />
      )}
    </div>
  );
}

export default App;