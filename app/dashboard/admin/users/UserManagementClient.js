'use client';
import { useState } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function UserManagementClient({ initialUsers, stats = {} }) {
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSearch = (e) => {
        e.preventDefault();
        router.push(`/dashboard/admin/users?q=${search}`);
    };

    const toggleBan = async (userId, currentStatus) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'unban' : 'ban'} this user?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ banned: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            router.refresh();
        } catch (err) {
            alert('Error updating user: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* User Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Users', value: stats.total, color: 'primary', icon: 'group' },
                    { label: 'Active', value: stats.active, color: 'green-500', icon: 'person_check' },
                    { label: 'Admins', value: stats.admins, color: 'purple-500', icon: 'shield_person' },
                    { label: 'Banned', value: stats.banned, color: 'red-500', icon: 'person_off' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41]">
                        <div className="flex items-center gap-4">
                            <div className={`size-10 rounded-lg bg-${stat.color}/10 text-${stat.color} flex items-center justify-center`}>
                                <span className="material-symbols-outlined">{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-[#4b636c] dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                                <h4 className="text-xl font-black">{stat.value || 0}</h4>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-wrap items-center justify-between gap-4">
                <form onSubmit={handleSearch} className="relative w-full md:w-96 group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#4b636c] group-focus-within:text-primary transition-colors">search</span>
                    <input
                        className="w-full bg-background-light dark:bg-[#212b30] border-none rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-[#4b636c]"
                        placeholder="Search Executive Directory..."
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-primary/5 transition-colors">
                        <span className="material-symbols-outlined text-sm">filter_list</span>
                        Campus
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-primary/5 transition-colors">
                        <span className="material-symbols-outlined text-sm">sort</span>
                        Role
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-primary/5 transition-colors">
                        <span className="material-symbols-outlined text-sm">history</span>
                        Status
                    </button>
                </div>
            </div>

            {/* User Directory Table */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
                            <th className="px-6 py-4">Identity</th>
                            <th className="px-6 py-4">Locality</th>
                            <th className="px-6 py-4">Compliance Status</th>
                            <th className="px-6 py-4">Registry Date</th>
                            <th className="px-6 py-4 text-center">Operations</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41]">
                        {initialUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-primary/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary overflow-hidden">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt="" className="size-full object-cover" />
                                            ) : (
                                                user.display_name?.[0]?.toUpperCase() || 'U'
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-[#111618] dark:text-gray-200 group-hover:text-primary transition-colors">{user.display_name || 'Anonymous'}</p>
                                            <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-tighter">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-[#111618] dark:text-gray-200">{user.campus || 'N/A'}</p>
                                    <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">{user.phone || 'No Phone'}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase w-fit ${user.banned ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'
                                            }`}>
                                            {user.banned ? 'Banned' : 'Verified Agent'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-[#4b636c]/10 text-[#4b636c] w-fit ${user.is_admin ? 'text-primary' : ''
                                            }`}>
                                            {user.is_admin ? 'Authority Admin' : 'Active Member'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-[#111618] dark:text-gray-200">{new Date(user.created_at).toLocaleDateString()}</p>
                                    <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">Enrolled</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button className="size-8 rounded-lg bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors border border-transparent hover:border-primary/20">
                                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                                        </button>
                                        <button
                                            onClick={() => toggleBan(user.id, user.banned)}
                                            disabled={loading || user.is_admin}
                                            className={`size-8 rounded-lg flex items-center justify-center transition-colors border border-transparent ${user.banned
                                                ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:border-green-500/20'
                                                : 'bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:border-red-500/20'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {user.banned ? 'undo' : 'block'}
                                            </span>
                                        </button>
                                        <button className="size-8 rounded-lg bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors border border-transparent hover:border-primary/20">
                                            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Placeholder */}
            <div className="flex items-center justify-between px-2">
                <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">Record <span className="text-[#111618] dark:text-white">1-{initialUsers.length}</span> of <span className="text-[#111618] dark:text-white">{stats.total}</span></p>
                <div className="flex gap-2">
                    <button className="size-10 rounded-xl bg-white/70 dark:bg-[#182125]/70 border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors disabled:opacity-50" disabled>
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button className="size-10 rounded-xl bg-white/70 dark:bg-[#182125]/70 border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors disabled:opacity-50" disabled>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

