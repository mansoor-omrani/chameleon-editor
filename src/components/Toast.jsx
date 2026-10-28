import { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const colors = {
        success: { background: '#4caf50', color: 'white' },
        error: { background: '#f44336', color: 'white' },
        info: { background: '#2196f3', color: 'white' },
    };

    return (
        <div style={{
            position: 'fixed', bottom: '20px', right: '20px', zIndex: 2000,
            padding: '10px 16px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            ...colors[type]
        }}>
            {message}
        </div>
    );
}