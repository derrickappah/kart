'use client';

export default function MessagesLayout({ children }) {
    return (
        <div className="bg-white dark:bg-[#242428] w-full" style={{ height: 'calc(100dvh - 144px)' }}>
            <div className="relative flex flex-col h-full w-full max-w-md mx-auto bg-white dark:bg-[#242428] shadow-2xl dark:shadow-none overflow-hidden">
                {children}
            </div>
        </div>
    );
}
