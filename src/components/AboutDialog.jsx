export default function AboutDialog({ onClose }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                background: 'white', borderRadius: '8px', width: '420px', maxWidth: '90vw',
                padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }}>
                <h3 style={{ marginTop: 0 }}>About Chameleon Editor</h3>
                <p style={{ margin: '8px 0' }}><strong>Version:</strong> 0.1.0</p>
                <p style={{ margin: '8px 0', color: '#444', lineHeight: 1.6 }}>
                    یک ویرایشگر دسکتاپ برای مدیریت و ویرایش اسکریپت‌های پایگاه داده SQL Server
                    و منابع پروژه Chameleon. این برنامه با Tauri، React و Rust ساخته شده است.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button onClick={onClose} style={{ padding: '6px 16px' }}>OK</button>
                </div>
            </div>
        </div>
    );
}