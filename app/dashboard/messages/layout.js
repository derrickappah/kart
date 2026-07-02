'use client';
import { usePathname } from 'next/navigation';

export default function MessagesLayout({ children }) {
    const pathname = usePathname();
    const isMessageDetails = pathname?.startsWith('/dashboard/messages/') && pathname !== '/dashboard/messages';

    return (
        <div className={`bg-white dark:bg-[#242428] w-full ${isMessageDetails ? 'h-[100dvh]' : 'h-[calc(100dvh-130px)] sm:h-[calc(100vh-130px)]'}`}>
            <div className="relative flex flex-col h-full w-full max-w-md mx-auto bg-white dark:bg-[#242428] overflow-hidden">
                {children}
            </div>
        </div>
    );
}
