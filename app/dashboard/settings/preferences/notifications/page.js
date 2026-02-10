'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function NotificationSettingsPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [settings, setSettings] = useState({
        push_orders: true,
        push_messages: true,
        push_promotions: false,
        email_weekly: true,
    });

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('notification_prefs')
                    .eq('id', user.id)
                    .maybeSingle();

                if (data?.notification_prefs) {
                    setSettings(data.notification_prefs);
                }
                setProfile(user);
            }
        };
        getProfile();
    }, [supabase]);

    const toggleSetting = async (key) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);

        // Optimistic update
        const { error } = await supabase
            .from('profiles')
            .update({ notification_prefs: newSettings })
            .eq('id', profile.id);

        if (error) {
            // Rollback on error
            setSettings(settings);
        }
    };

    const Toggle = ({ active, onToggle, label, description, icon }) => (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-[#1E292B] rounded-2xl shadow-sm border border-transparent dark:border-slate-800">
            <div className="flex items-center gap-4">
                <div className={`size-10 rounded-full flex items-center justify-center ${active ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div>
                    <p className="font-bold text-slate-900 dark:text-white">{label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
                </div>
            </div>
            <button
                onClick={onToggle}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
                <div className={`absolute top-1 left-1 size-4 bg-white rounded-full transition-transform duration-200 ${active ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            <header className="px-4 pt-6 flex items-center gap-4">
                <button onClick={() => router.back()} className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-[#1E292B] shadow-sm">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold">Notifications</h1>
            </header>

            <main className="flex-1 px-4 pt-8 space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">Push Notifications</h2>

                <Toggle
                    label="Orders & Sales"
                    description="Get notified when someone buys your item"
                    icon="shopping_bag"
                    active={settings.push_orders}
                    onToggle={() => toggleSetting('push_orders')}
                />

                <Toggle
                    label="Messages"
                    description="Alerts for new chat messages"
                    icon="chat"
                    active={settings.push_messages}
                    onToggle={() => toggleSetting('push_messages')}
                />

                <Toggle
                    label="Promotions"
                    description="Updates on sales and special offers"
                    icon="campaign"
                    active={settings.push_promotions}
                    onToggle={() => toggleSetting('push_promotions')}
                />

                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-2 pt-4">Email Preferences</h2>

                <Toggle
                    label="Weekly Digest"
                    description="Summary of your activity and trends"
                    icon="mail"
                    active={settings.email_weekly}
                    onToggle={() => toggleSetting('email_weekly')}
                />

                <div className="mt-8 p-4 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-sm">lock</span>
                    <span className="text-xs text-slate-500 font-medium tracking-tight">Preferences are synced across all your devices</span>
                </div>
            </main>
        </div>
    );
}
