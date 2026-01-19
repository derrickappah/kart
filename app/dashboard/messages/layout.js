'use client';

export default function MessagesLayout({ children }) {
    return (
        <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
            {children}
        </div>
    );
}
