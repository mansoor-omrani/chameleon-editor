export default function ConfirmDialog({
    title = 'تأیید',
    message,
    confirmLabel = 'تأیید',
    cancelLabel = 'انصراف',
    danger = false,
    onConfirm,
    onCancel,
}) {
    return (
        <div
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
            }}
            onClick={onCancel}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'white', borderRadius: '8px', width: '400px', maxWidth: '90vw',
                    padding: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
                }}
            >
                <h3 style={{ marginTop: 0, marginBottom: '12px' }}>{title}</h3>
                <p style={{ margin: '0 0 20px', color: '#444', lineHeight: 1.6 }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{ padding: '6px 16px', cursor: 'pointer' }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '6px 16px',
                            cursor: 'pointer',
                            background: danger ? '#d32f2f' : '#0078d4',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px'
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}