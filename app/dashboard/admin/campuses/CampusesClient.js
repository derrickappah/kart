'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';

const GHANA_REGIONS = [
    'Greater Accra Region',
    'Ashanti Region',
    'Eastern Region',
    'Bono Region',
    'Bono East Region',
    'Ahafo Region',
    'Central Region',
    'Volta Region',
    'Oti Region',
    'Northern Region',
    'Savannah Region',
    'North East Region',
    'Upper East Region',
    'Upper West Region',
    'Western Region',
    'Western North Region'
];

export default function CampusesClient({ initialCampuses }) {
    const [campuses, setCampuses] = useState(initialCampuses);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const supabase = createClient();

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCampus, setEditingCampus] = useState(null);

    // Form fields
    const [name, setName] = useState('');
    const [abbreviation, setAbbreviation] = useState('');
    const [region, setRegion] = useState(GHANA_REGIONS[0]);

    // Toast feedback
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleOpenAdd = () => {
        setName('');
        setAbbreviation('');
        setRegion(GHANA_REGIONS[0]);
        setShowAddModal(true);
    };

    const handleOpenEdit = (campus) => {
        setEditingCampus(campus);
        setName(campus.name);
        setAbbreviation(campus.abbreviation);
        setRegion(GHANA_REGIONS.includes(campus.region) ? campus.region : GHANA_REGIONS[0]);
    };

    const handleSaveNew = async (e) => {
        e.preventDefault();
        if (!name.trim() || !abbreviation.trim()) {
            showToast('Please fill out all fields', 'error');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('campus_locations')
                .insert({
                    name: name.trim(),
                    abbreviation: abbreviation.trim().toUpperCase(),
                    region
                })
                .select();

            if (error) throw error;

            showToast('Campus location added successfully!');
            setShowAddModal(false);
            
            // Update local state and trigger router refresh
            if (data && data[0]) {
                setCampuses(prev => [data[0], ...prev]);
            }
            startTransition(() => {
                router.refresh();
            });
        } catch (err) {
            showToast(err.message || 'Error creating campus', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!name.trim() || !abbreviation.trim()) {
            showToast('Please fill out all fields', 'error');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('campus_locations')
                .update({
                    name: name.trim(),
                    abbreviation: abbreviation.trim().toUpperCase(),
                    region
                })
                .eq('id', editingCampus.id);

            if (error) throw error;

            showToast('Campus location updated successfully!');
            setEditingCampus(null);

            setCampuses(prev =>
                prev.map(c => c.id === editingCampus.id ? { ...c, name: name.trim(), abbreviation: abbreviation.trim().toUpperCase(), region } : c)
            );
            startTransition(() => {
                router.refresh();
            });
        } catch (err) {
            showToast(err.message || 'Error updating campus', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (campus) => {
        if (!confirm(`Are you sure you want to delete ${campus.name} (${campus.abbreviation})?`)) {
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('campus_locations')
                .delete()
                .eq('id', campus.id);

            if (error) throw error;

            showToast('Campus location deleted successfully!');
            setCampuses(prev => prev.filter(c => c.id !== campus.id));
            startTransition(() => {
                router.refresh();
            });
        } catch (err) {
            showToast(err.message || 'Error deleting campus', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filter campuses
    const filteredCampuses = campuses.filter(c => {
        const query = search.toLowerCase();
        return (
            c.name.toLowerCase().includes(query) ||
            c.abbreviation.toLowerCase().includes(query) ||
            c.region.toLowerCase().includes(query)
        );
    });

    // Stats calculations
    const totalCampuses = campuses.length;
    const uniqueRegions = new Set(campuses.map(c => c.region)).size;

    return (
        <div className="space-y-6 relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold transition-all duration-300 animate-slide-in ${
                    toast.type === 'error'
                        ? 'bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-900/50'
                        : 'bg-green-50 dark:bg-green-950/20 text-green-600 border-green-200 dark:border-green-900/50'
                }`}>
                    <DynamicLucideIcon name={toast.type === 'error' ? 'error' : 'check_circle'} className="text-lg" />
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Campus Locations</h1>
                    <p className="text-xs text-[#4b636c] dark:text-gray-400 font-bold uppercase tracking-wider mt-1">
                        Preload & Manage University Localities
                    </p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 cursor-pointer"
                >
                    <DynamicLucideIcon name="add" className="text-lg" />
                    Add Location
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                    { label: 'Total Universities', value: totalCampuses, color: 'primary', icon: 'school' },
                    { label: 'Regions Represented', value: uniqueRegions, color: 'green-500', icon: 'map' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41]">
                        <div className="flex items-center gap-4">
                            <div className={`size-10 rounded-lg bg-${stat.color}/10 text-${stat.color} flex items-center justify-center flex-shrink-0`}>
                                <DynamicLucideIcon name={stat.icon} />
                            </div>
                            <div>
                                <p className="text-[#4b636c] dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                                <h4 className="text-xl font-black">{stat.value}</h4>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search Bar */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41]">
                <div className="relative w-full group">
                    <DynamicLucideIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b636c] group-focus-within:text-primary transition-colors" />
                    <input
                        className="w-full bg-background-light dark:bg-[#212b30] border-none rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-[#4b636c]"
                        placeholder="Search by university name, abbreviation, or region..."
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse min-w-[700px] md:min-w-0">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
                                <th className="px-6 py-4">University Name</th>
                                <th className="px-6 py-4">Abbreviation</th>
                                <th className="px-6 py-4">Region</th>
                                <th className="px-6 py-4 text-center">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41]">
                            {filteredCampuses.map((campus) => (
                                <tr key={campus.id} className="hover:bg-primary/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-black text-[#111618] dark:text-gray-200 group-hover:text-primary transition-colors">
                                            {campus.name}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#4b636c]/10 text-[#4b636c] dark:text-gray-300">
                                            {campus.abbreviation}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-[#111618] dark:text-gray-200">
                                            {campus.region}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(campus)}
                                                className="size-8 rounded-lg bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-primary border border-transparent hover:border-primary/20 transition-all cursor-pointer"
                                                title="Edit Location"
                                            >
                                                <DynamicLucideIcon name="edit" className="text-[18px]" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(campus)}
                                                className="size-8 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-transparent hover:border-red-500/20 flex items-center justify-center transition-all cursor-pointer"
                                                title="Delete Location"
                                            >
                                                <DynamicLucideIcon name="delete" className="text-[18px]" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCampuses.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">
                                        No campuses found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Add Campus */}
            {showAddModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                    {/* Content */}
                    <div className="bg-white dark:bg-[#1a2327] rounded-2xl w-full max-w-md border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden z-10 p-6 space-y-4 animate-scale-in">
                        <div className="flex items-center justify-between border-b border-[#dce3e5]/20 dark:border-[#2d3b41]/20 pb-3">
                            <h3 className="text-lg font-black">Add New Campus</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="size-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#253237] flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <DynamicLucideIcon name="close" className="text-xl" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveNew} className="space-y-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[#4b636c] ml-1">University Name</label>
                                <input
                                    required
                                    className="w-full bg-[#f4f7f8] dark:bg-[#253237] border-none rounded-xl px-4 py-3 text-sm font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-900 dark:text-white"
                                    placeholder="e.g. University of Ghana"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[#4b636c] ml-1">Abbreviation</label>
                                <input
                                    required
                                    className="w-full bg-[#f4f7f8] dark:bg-[#253237] border-none rounded-xl px-4 py-3 text-sm font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-900 dark:text-white"
                                    placeholder="e.g. UG"
                                    type="text"
                                    value={abbreviation}
                                    onChange={(e) => setAbbreviation(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[#4b636c] ml-1">Region</label>
                                <select
                                    className="w-full bg-[#f4f7f8] dark:bg-[#253237] border-none rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-900 dark:text-white"
                                    value={region}
                                    onChange={(e) => setRegion(e.target.value)}
                                >
                                    {GHANA_REGIONS.map((r, i) => (
                                        <option key={i} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? 'Saving...' : 'Add Location'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Campus */}
            {editingCampus && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingCampus(null)} />
                    {/* Content */}
                    <div className="bg-white dark:bg-[#1a2327] rounded-2xl w-full max-w-md border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden z-10 p-6 space-y-4 animate-scale-in">
                        <div className="flex items-center justify-between border-b border-[#dce3e5]/20 dark:border-[#2d3b41]/20 pb-3">
                            <h3 className="text-lg font-black">Edit Campus Location</h3>
                            <button
                                onClick={() => setEditingCampus(null)}
                                className="size-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#253237] flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <DynamicLucideIcon name="close" className="text-xl" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[#4b636c] ml-1">University Name</label>
                                <input
                                    required
                                    className="w-full bg-[#f4f7f8] dark:bg-[#253237] border-none rounded-xl px-4 py-3 text-sm font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-900 dark:text-white"
                                    placeholder="e.g. University of Ghana"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[#4b636c] ml-1">Abbreviation</label>
                                <input
                                    required
                                    className="w-full bg-[#f4f7f8] dark:bg-[#253237] border-none rounded-xl px-4 py-3 text-sm font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-900 dark:text-white"
                                    placeholder="e.g. UG"
                                    type="text"
                                    value={abbreviation}
                                    onChange={(e) => setAbbreviation(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[#4b636c] ml-1">Region</label>
                                <select
                                    className="w-full bg-[#f4f7f8] dark:bg-[#253237] border-none rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-900 dark:text-white"
                                    value={region}
                                    onChange={(e) => setRegion(e.target.value)}
                                >
                                    {GHANA_REGIONS.map((r, i) => (
                                        <option key={i} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? 'Saving Changes...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
