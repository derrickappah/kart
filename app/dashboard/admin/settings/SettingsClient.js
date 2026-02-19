'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TABS = [
    { id: 'general', label: 'General', icon: 'tune' },
    { id: 'financial', label: 'Financial', icon: 'account_balance' },
    { id: 'subscriptions', label: 'Subscriptions', icon: 'card_membership' },
    { id: 'promotions', label: 'Promotions', icon: 'campaign' },
];

export default function SettingsClient({ initialSettings, groupedSettings, initialPlans }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState(initialSettings);
    const [plans, setPlans] = useState(initialPlans);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    // Track edited values per setting key
    const [editedValues, setEditedValues] = useState({});
    // Subscription plan modals
    const [showNewPlanModal, setShowNewPlanModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const getSettingValue = (key) => {
        if (editedValues[key] !== undefined) return editedValues[key];
        const setting = settings.find(s => s.key === key);
        if (!setting) return '';
        // JSONB values might be strings or numbers
        const val = setting.value;
        if (typeof val === 'string') return val.replace(/^"|"$/g, '');
        return val;
    };

    const handleSettingChange = (key, value) => {
        setEditedValues(prev => ({ ...prev, [key]: value }));
    };

    const saveSettings = async (category) => {
        const categorySettings = settings.filter(s => s.category === category);
        const updates = categorySettings
            .filter(s => editedValues[s.key] !== undefined)
            .map(s => {
                let val = editedValues[s.key];
                // Wrap strings in quotes for JSONB, keep numbers as-is
                if (s.key === 'maintenance_mode') {
                    val = val === 'true' || val === true ? true : false;
                } else if (s.key === 'platform_support_email') {
                    val = `"${val}"`;
                } else if (!isNaN(val) && val !== '' && val !== true && val !== false) {
                    val = parseFloat(val);
                }
                return { key: s.key, value: val };
            });

        if (updates.length === 0) {
            showToast('No changes to save', 'info');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to save');

            // Update local state
            setSettings(prev => prev.map(s => {
                const updated = data.updated?.find(u => u.key === s.key);
                return updated ? { ...s, ...updated } : s;
            }));

            // Clear edited values for this category
            setEditedValues(prev => {
                const next = { ...prev };
                categorySettings.forEach(s => delete next[s.key]);
                return next;
            });

            showToast('Settings saved successfully');
            router.refresh();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const hasCategoryChanges = (category) => {
        return settings
            .filter(s => s.category === category)
            .some(s => editedValues[s.key] !== undefined);
    };

    // ═══════════════════════════════════════════
    // SUBSCRIPTION PLAN MANAGEMENT
    // ═══════════════════════════════════════════

    const [newPlan, setNewPlan] = useState({ name: '', price: '', duration_months: '', features: '' });

    const handleCreatePlan = async () => {
        if (!newPlan.name || !newPlan.price || !newPlan.duration_months) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        setSaving(true);
        try {
            const features = newPlan.features
                ? newPlan.features.split('\n').map(f => f.trim()).filter(Boolean)
                : [];

            const res = await fetch('/api/admin/subscription-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newPlan.name,
                    price: parseFloat(newPlan.price),
                    duration_months: parseInt(newPlan.duration_months),
                    features
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create plan');

            setPlans(prev => [...prev, data.plan].sort((a, b) => a.price - b.price));
            setNewPlan({ name: '', price: '', duration_months: '', features: '' });
            setShowNewPlanModal(false);
            showToast('Plan created successfully');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePlan = async () => {
        if (!editingPlan) return;

        setSaving(true);
        try {
            const features = typeof editingPlan.features === 'string'
                ? editingPlan.features.split('\n').map(f => f.trim()).filter(Boolean)
                : editingPlan.features;

            const res = await fetch('/api/admin/subscription-plans', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingPlan.id,
                    name: editingPlan.name,
                    price: parseFloat(editingPlan.price),
                    duration_months: parseInt(editingPlan.duration_months),
                    features
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update plan');

            setPlans(prev => prev.map(p => p.id === data.plan.id ? data.plan : p).sort((a, b) => a.price - b.price));
            setEditingPlan(null);
            showToast('Plan updated successfully');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePlan = async (planId) => {
        if (!confirm('Are you sure you want to delete this subscription plan? This cannot be undone.')) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/subscription-plans?id=${planId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete plan');

            setPlans(prev => prev.filter(p => p.id !== planId));
            showToast('Plan deleted successfully');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ═══════════════════════════════════════════
    // RENDER HELPERS
    // ═══════════════════════════════════════════

    const renderSettingInput = (setting) => {
        const value = getSettingValue(setting.key);
        const isEdited = editedValues[setting.key] !== undefined;

        if (setting.key === 'maintenance_mode') {
            return (
                <button
                    onClick={() => handleSettingChange(setting.key, value === true || value === 'true' ? 'false' : 'true')}
                    className={`relative w-14 h-7 rounded-full transition-all duration-300 ${value === true || value === 'true'
                        ? 'bg-red-500 shadow-lg shadow-red-500/30'
                        : 'bg-[#dce3e5] dark:bg-[#2d3b41]'
                        }`}
                >
                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${value === true || value === 'true' ? 'left-7' : 'left-0.5'
                        }`} />
                </button>
            );
        }

        return (
            <div className="relative">
                <input
                    type={['price', 'fee', 'amount', 'percent', 'max'].some(k => setting.key.includes(k)) ? 'number' : 'text'}
                    value={value}
                    onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                    className={`w-full bg-white dark:bg-[#182125] border rounded-xl px-4 py-3 text-sm font-bold tracking-tight transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${isEdited
                        ? 'border-primary shadow-sm shadow-primary/10'
                        : 'border-[#dce3e5] dark:border-[#2d3b41]'
                        }`}
                    step={setting.key.includes('percent') ? '0.1' : '1'}
                    min="0"
                />
                {isEdited && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="size-2 bg-primary rounded-full inline-block animate-pulse" />
                    </div>
                )}
            </div>
        );
    };

    const renderSettingCard = (setting) => (
        <div key={setting.key} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col gap-3">
                <div>
                    <p className="text-sm font-black tracking-tight">{setting.label}</p>
                    {setting.description && (
                        <p className="text-[10px] font-bold text-[#4b636c] uppercase tracking-widest mt-1">{setting.description}</p>
                    )}
                </div>
                {renderSettingInput(setting)}
            </div>
        </div>
    );

    // ═══════════════════════════════════════════
    // TAB CONTENT RENDERERS
    // ═══════════════════════════════════════════

    const renderGeneralTab = () => {
        const generalSettings = settings.filter(s => s.category === 'general');
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black tracking-tighter">General Configuration</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mt-1">Core platform settings and behavior</p>
                    </div>
                    {hasCategoryChanges('general') && (
                        <button
                            onClick={() => saveSettings('general')}
                            disabled={saving}
                            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-[18px]">save</span>
                            )}
                            Save Changes
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {generalSettings.map(renderSettingCard)}
                </div>
            </div>
        );
    };

    const renderFinancialTab = () => {
        const financialSettings = settings.filter(s => s.category === 'financial');
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black tracking-tighter">Financial Controls</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mt-1">Fees, commissions, and transaction limits</p>
                    </div>
                    {hasCategoryChanges('financial') && (
                        <button
                            onClick={() => saveSettings('financial')}
                            disabled={saving}
                            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-[18px]">save</span>
                            )}
                            Save Changes
                        </button>
                    )}
                </div>

                {/* Revenue Overview Bar */}
                <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[28px]">monetization_on</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Revenue Model Overview</p>
                            <p className="text-sm font-bold text-[#4b636c] mt-1">
                                Transaction fee: <span className="text-primary font-black">{getSettingValue('transaction_fee_percent')}%</span> per sale &nbsp;·&nbsp;
                                Withdrawal fee: <span className="text-primary font-black">GH₵ {getSettingValue('withdrawal_fee_flat')}</span> flat &nbsp;·&nbsp;
                                Service fee: <span className="text-primary font-black">GH₵ {getSettingValue('marketplace_service_fee')}</span> flat
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {financialSettings.map(renderSettingCard)}
                </div>
            </div>
        );
    };

    const renderSubscriptionsTab = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black tracking-tighter">Subscription Plans</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mt-1">Manage pricing tiers and features</p>
                </div>
                <button
                    onClick={() => setShowNewPlanModal(true)}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    New Plan
                </button>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group">
                        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 border-b border-[#dce3e5] dark:border-[#2d3b41]">
                            <div className="flex items-center justify-between mb-3">
                                <span className="px-3 py-1 rounded-xl bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">
                                    {plan.duration_months} {plan.duration_months === 1 ? 'Month' : 'Months'}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setEditingPlan({
                                            ...plan,
                                            features: Array.isArray(plan.features) ? plan.features.join('\n') : ''
                                        })}
                                        className="size-8 rounded-lg bg-white/50 dark:bg-white/10 hover:bg-primary hover:text-white transition-all flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeletePlan(plan.id)}
                                        className="size-8 rounded-lg bg-white/50 dark:bg-white/10 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                </div>
                            </div>
                            <h4 className="text-lg font-black tracking-tighter">{plan.name}</h4>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-3xl font-black text-primary">GH₵{parseFloat(plan.price).toFixed(0)}</span>
                                <span className="text-[10px] font-black text-[#4b636c] uppercase tracking-widest">/ {plan.duration_months}mo</span>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-3">Features Included</p>
                            <ul className="space-y-2">
                                {(plan.features || []).map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check_circle</span>
                                        <span className="text-xs font-bold text-[#4b636c]">{feature}</span>
                                    </li>
                                ))}
                                {(!plan.features || plan.features.length === 0) && (
                                    <li className="text-xs text-[#4b636c]/50 italic">No features listed</li>
                                )}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>

            {plans.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="size-20 bg-gray-100 dark:bg-[#182125] rounded-3xl flex items-center justify-center mb-6 border border-[#dce3e5] dark:border-[#2d3b41]">
                        <span className="material-symbols-outlined text-4xl text-[#4b636c]/30">card_membership</span>
                    </div>
                    <h3 className="text-xl font-black tracking-tighter uppercase">No Plans Created</h3>
                    <p className="text-[#4b636c] text-[10px] font-black uppercase tracking-widest mt-2 max-w-xs">Create your first subscription plan to start monetizing.</p>
                </div>
            )}
        </div>
    );

    const renderPromotionsTab = () => {
        const promoSettings = settings.filter(s => s.category === 'promotion');
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black tracking-tighter">Promotion Pricing</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mt-1">Set prices for listing boosts and featured placements</p>
                    </div>
                    {hasCategoryChanges('promotion') && (
                        <button
                            onClick={() => saveSettings('promotion')}
                            disabled={saving}
                            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-[18px]">save</span>
                            )}
                            Save Changes
                        </button>
                    )}
                </div>

                {/* Promotion Tiers Preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { key: 'promo_daily_price', name: 'Daily Blast', icon: 'bolt', duration: '24 hours', color: 'amber' },
                        { key: 'promo_weekly_price', name: 'Weekly Saver', icon: 'date_range', duration: '7 days', color: 'green' },
                        { key: 'promo_featured_price', name: 'Featured Spotlight', icon: 'star', duration: 'Lifetime', color: 'blue' },
                    ].map(tier => {
                        const setting = settings.find(s => s.key === tier.key);
                        if (!setting) return null;
                        const currentVal = getSettingValue(tier.key);
                        const isEdited = editedValues[tier.key] !== undefined;

                        return (
                            <div key={tier.key} className={`bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border overflow-hidden shadow-sm transition-all ${isEdited ? 'border-primary shadow-lg shadow-primary/10' : 'border-[#dce3e5] dark:border-[#2d3b41]'
                                }`}>
                                <div className={`p-6 bg-gradient-to-br ${tier.color === 'amber' ? 'from-amber-500/10 to-amber-500/5' :
                                    tier.color === 'green' ? 'from-green-500/10 to-green-500/5' :
                                        'from-blue-500/10 to-blue-500/5'
                                    } border-b border-[#dce3e5] dark:border-[#2d3b41]`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`size-10 rounded-xl flex items-center justify-center ${tier.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
                                            tier.color === 'green' ? 'bg-green-500/10 text-green-500' :
                                                'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            <span className="material-symbols-outlined text-[24px]">{tier.icon}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-base font-black tracking-tighter">{tier.name}</h4>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c]">{tier.duration}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-2">Price (GH₵)</p>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4b636c] font-black text-sm">₵</span>
                                        <input
                                            type="number"
                                            value={currentVal}
                                            onChange={(e) => handleSettingChange(tier.key, e.target.value)}
                                            className={`w-full bg-white dark:bg-[#111d21] border rounded-xl pl-8 pr-4 py-3 text-lg font-black tracking-tight transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${isEdited ? 'border-primary' : 'border-[#dce3e5] dark:border-[#2d3b41]'
                                                }`}
                                            min="0"
                                            step="1"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════
    // MODALS
    // ═══════════════════════════════════════════

    const renderPlanModal = (isEdit = false) => {
        const plan = isEdit ? editingPlan : newPlan;
        const setPlan = isEdit
            ? (updater) => setEditingPlan(prev => typeof updater === 'function' ? updater(prev) : { ...prev, ...updater })
            : (updater) => setNewPlan(prev => typeof updater === 'function' ? updater(prev) : { ...prev, ...updater });
        const onSave = isEdit ? handleUpdatePlan : handleCreatePlan;
        const onClose = isEdit ? () => setEditingPlan(null) : () => setShowNewPlanModal(false);

        if (!plan) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <div className="relative bg-white dark:bg-[#182125] rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                    <div className="p-6 border-b border-[#dce3e5] dark:border-[#2d3b41] bg-gradient-to-r from-primary/5 to-transparent">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black tracking-tighter">{isEdit ? 'Edit Plan' : 'Create New Plan'}</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mt-1">
                                    {isEdit ? 'Modify subscription plan details' : 'Set up a new subscription tier'}
                                </p>
                            </div>
                            <button onClick={onClose} className="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-[#212b30] flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] block mb-2">Plan Name *</label>
                            <input
                                type="text"
                                value={plan.name}
                                onChange={(e) => setPlan({ name: e.target.value })}
                                placeholder="e.g. Monthly, Yearly"
                                className="w-full bg-white dark:bg-[#111d21] border border-[#dce3e5] dark:border-[#2d3b41] rounded-xl px-4 py-3 text-sm font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] block mb-2">Price (GH₵) *</label>
                                <input
                                    type="number"
                                    value={plan.price}
                                    onChange={(e) => setPlan({ price: e.target.value })}
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                    className="w-full bg-white dark:bg-[#111d21] border border-[#dce3e5] dark:border-[#2d3b41] rounded-xl px-4 py-3 text-sm font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] block mb-2">Duration (Months) *</label>
                                <input
                                    type="number"
                                    value={plan.duration_months}
                                    onChange={(e) => setPlan({ duration_months: e.target.value })}
                                    placeholder="1"
                                    min="1"
                                    className="w-full bg-white dark:bg-[#111d21] border border-[#dce3e5] dark:border-[#2d3b41] rounded-xl px-4 py-3 text-sm font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] block mb-2">Features (one per line)</label>
                            <textarea
                                value={typeof plan.features === 'string' ? plan.features : (plan.features || []).join('\n')}
                                onChange={(e) => setPlan({ features: e.target.value })}
                                placeholder="Unlimited listings&#10;Seller dashboard&#10;Basic analytics"
                                rows={5}
                                className="w-full bg-white dark:bg-[#111d21] border border-[#dce3e5] dark:border-[#2d3b41] rounded-xl px-4 py-3 text-sm font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                            />
                        </div>
                    </div>

                    <div className="p-6 border-t border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-gray-100 dark:hover:bg-[#212b30] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            disabled={saving}
                            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-[18px]">{isEdit ? 'check' : 'add'}</span>
                            )}
                            {isEdit ? 'Update Plan' : 'Create Plan'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════
    // MAIN RENDER
    // ═══════════════════════════════════════════

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[24px]">settings</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Control Center</p>
                            <h1 className="text-2xl font-black tracking-tighter">Platform Settings</h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] p-2 flex gap-1 overflow-x-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-[#4b636c] hover:bg-gray-100 dark:hover:bg-[#212b30]'
                            }`}
                    >
                        <span className={`material-symbols-outlined text-[18px] ${activeTab === tab.id ? 'text-white' : ''}`}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'general' && renderGeneralTab()}
                {activeTab === 'financial' && renderFinancialTab()}
                {activeTab === 'subscriptions' && renderSubscriptionsTab()}
                {activeTab === 'promotions' && renderPromotionsTab()}
            </div>

            {/* Modals */}
            {showNewPlanModal && renderPlanModal(false)}
            {editingPlan && renderPlanModal(true)}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-bottom-4 ${toast.type === 'error'
                    ? 'bg-red-500/90 text-white'
                    : toast.type === 'info'
                        ? 'bg-[#111618]/90 text-white'
                        : 'bg-green-500/90 text-white'
                    }`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
                    </span>
                    <p className="text-sm font-black tracking-tight">{toast.message}</p>
                </div>
            )}
        </div>
    );
}
