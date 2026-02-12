'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/Layout/PageHeader';
import Card from '@/components/ui/Card';
import Icon from '@/components/Icon';

const UNITS = ['HOUR', 'DAY', 'FIXED', 'MONTHLY'];

export default function RateCardManagementPage() {
    const [ratecards, setRatecards] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterVendor, setFilterVendor] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [formData, setFormData] = useState({
        vendorId: '',
        name: '',
        effectiveFrom: '',
        effectiveTo: '',
        notes: '',
        rates: [{ description: '', unit: 'HOUR', rate: '', currency: 'INR' }]
    });

    useEffect(() => {
        fetchRatecards();
        fetchVendors();
    }, [filterVendor, filterStatus]);

    const fetchRatecards = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterVendor) params.append('vendorId', filterVendor);
            if (filterStatus) params.append('status', filterStatus);

            const res = await fetch(`/api/admin/ratecards?${params}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setRatecards(data.ratecards || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async () => {
        try {
            const res = await fetch('/api/vendors');
            const data = await res.json();
            if (res.ok) setVendors(data.vendors || []);
        } catch (err) {
            console.error('Error fetching vendors:', err);
        }
    };

    const handleCreateRatecard = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/ratecards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    rates: formData.rates.filter(r => r.description && r.rate)
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setShowCreateModal(false);
            resetForm();
            fetchRatecards();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleUpdateRatecard = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/admin/ratecards/${editingCard.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    rates: formData.rates.filter(r => r.description && r.rate)
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setEditingCard(null);
            resetForm();
            fetchRatecards();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleArchive = async (card) => {
        if (!confirm(`Archive rate card "${card.name}"?`)) return;
        try {
            const res = await fetch(`/api/admin/ratecards/${card.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to archive');
            fetchRatecards();
        } catch (err) {
            setError(err.message);
        }
    };

    const resetForm = () => {
        setFormData({
            vendorId: '',
            name: '',
            effectiveFrom: '',
            effectiveTo: '',
            notes: '',
            rates: [{ description: '', unit: 'HOUR', rate: '', currency: 'INR' }]
        });
    };

    const openEditModal = (card) => {
        setFormData({
            vendorId: card.vendorId,
            name: card.name,
            effectiveFrom: card.effectiveFrom ? card.effectiveFrom.split('T')[0] : '',
            effectiveTo: card.effectiveTo ? card.effectiveTo.split('T')[0] : '',
            notes: card.notes || '',
            rates: card.rates.length ? [...card.rates] : [{ description: '', unit: 'HOUR', rate: '', currency: 'INR' }]
        });
        setEditingCard(card);
    };

    const addRateRow = () => {
        setFormData({
            ...formData,
            rates: [...formData.rates, { description: '', unit: 'HOUR', rate: '', currency: 'INR' }]
        });
    };

    const updateRate = (idx, field, value) => {
        const newRates = [...formData.rates];
        newRates[idx] = { ...newRates[idx], [field]: value };
        setFormData({ ...formData, rates: newRates });
    };

    const removeRate = (idx) => {
        setFormData({
            ...formData,
            rates: formData.rates.filter((_, i) => i !== idx)
        });
    };

    return (
        <div className="px-4 sm:px-8 py-6 sm:py-8 min-h-screen">
            <PageHeader
                title="Rate Management"
                subtitle="Standardize vendor service rates"
                icon="Layers"
                accent="purple"
                actions={
                    <button
                        onClick={() => { resetForm(); setShowCreateModal(true); }}
                        className="flex items-center justify-center gap-2 h-10 px-4 sm:px-6 bg-linear-to-br from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all whitespace-nowrap"
                    >
                        <Icon name="Plus" size={16} /> <span className="hidden xs:inline">New Rate Card</span><span className="xs:hidden">New</span>
                    </button>
                }
            />

            <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
                {/* Filters & Actions */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-3 sm:p-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Icon name="Building" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                    value={filterVendor}
                                    onChange={(e) => setFilterVendor(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-100 rounded-xl text-slate-700 font-bold text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all appearance-none"
                                >
                                    <option value="">All Vendors</option>
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.vendorCode ? `${v.vendorCode} · ${v.name}` : v.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative w-full sm:w-48">
                                <Icon name="Filter" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-100 rounded-xl text-slate-700 font-bold text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all appearance-none"
                                >
                                    <option value="">All Status</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="EXPIRED">Expired</option>
                                    <option value="DRAFT">Draft</option>
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={() => { resetForm(); setShowCreateModal(true); }}
                            className="w-full sm:w-auto px-6 py-3 bg-linear-to-br from-purple-600 to-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Icon name="Plus" size={14} /> <span className="hidden xs:inline">Create Rate Card</span><span className="xs:hidden">Create</span>
                        </button>
                    </div>
                </div>

                {/* Error Display */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex justify-between items-center"
                        >
                            <span className="font-bold text-sm">{error}</span>
                            <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded-lg">✕</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Rate Cards Grid */}
                {loading ? (
                    <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                        <span className="loading loading-spinner h-8 w-8 text-purple-600"></span>
                        <p className="mt-4 text-slate-500 font-bold text-[10px] uppercase tracking-widest">Fetching Rates...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {ratecards.map((card, idx) => (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card className="h-full hover:shadow-xl hover:shadow-purple-500/5 transition-all border-slate-200/60 p-6 flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-black text-slate-800 tracking-tight truncate" title={card.name}>
                                                {card.name}
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                {card.vendorName}
                                            </p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border shrink-0 ${card.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            card.status === 'EXPIRED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                            {card.status}
                                        </span>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-50">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Effective From</p>
                                                <p className="text-xs font-bold text-slate-700">{new Date(card.effectiveFrom).toLocaleDateString()}</p>
                                            </div>
                                            {card.effectiveTo && (
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Valid Until</p>
                                                    <p className="text-xs font-bold text-slate-700">{new Date(card.effectiveTo).toLocaleDateString()}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Rate Definitions ({card.rates.length})</p>
                                            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                                {card.rates.map((rate, i) => (
                                                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-50/50 border border-slate-100/50">
                                                        <span className="text-xs font-bold text-slate-600 truncate mr-2" title={rate.description}>{rate.description}</span>
                                                        <span className="text-xs font-black text-purple-600 shrink-0">₹ {rate.rate}/{rate.unit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
                                        <button
                                            onClick={() => openEditModal(card)}
                                            className="flex-1 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Icon name="Edit3" size={14} /> Edit
                                        </button>
                                        {card.status !== 'EXPIRED' && (
                                            <button
                                                onClick={() => handleArchive(card)}
                                                className="flex-1 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Icon name="Archive" size={14} /> Archive
                                            </button>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {!loading && ratecards.length === 0 && (
                    <Card className="text-center py-20 flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 transition-transform hover:scale-110">
                            <Icon name="Layers" size={32} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">No Rate Cards Found</h3>
                        <p className="text-slate-500 text-sm mt-1 max-w-xs font-medium">Define your first set of standard rates to get started with vendor management.</p>
                        <button
                            onClick={() => { resetForm(); setShowCreateModal(true); }}
                            className="mt-6 px-8 py-3 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
                        >
                            Create First Card
                        </button>
                    </Card>
                )}
            </div>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {(showCreateModal || editingCard) && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-100 p-4 overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-[32px] p-6 sm:p-10 w-full max-w-3xl shadow-2xl border border-slate-100 my-auto"
                        >
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-1">Administrative Action</p>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                        {editingCard ? 'Modify Rate Card' : 'Define New Rate Card'}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => { setShowCreateModal(false); setEditingCard(null); }}
                                    className="p-3 hover:bg-slate-50 rounded-2xl transition-all active:scale-90 group"
                                >
                                    <Icon name="X" size={20} className="text-slate-400 group-hover:text-slate-600" />
                                </button>
                            </div>

                            <form onSubmit={editingCard ? handleUpdateRatecard : handleCreateRatecard} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Assign Vendor</label>
                                        <div className="relative">
                                            <Icon name="Building" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <select
                                                value={formData.vendorId}
                                                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                                                required
                                                disabled={!!editingCard}
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-hidden transition-all appearance-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                                            >
                                                <option value="" className="text-slate-900 bg-white">Select a vendor...</option>
                                                {vendors.map(v => (
                                                    <option key={v.id} value={v.id} className="text-slate-900 bg-white">
                                                        {v.vendorCode ? `${v.vendorCode} · ${v.name}` : v.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Card Identifier (Name)</label>
                                        <div className="relative">
                                            <Icon name="Tag" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                placeholder="e.g. Standard 2026 Rates"
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-hidden transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Effective Period Start</label>
                                        <div className="relative">
                                            <Icon name="Calendar" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="date"
                                                value={formData.effectiveFrom}
                                                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                                                required
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-hidden transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Effective Period End (Optional)</label>
                                        <div className="relative">
                                            <Icon name="Calendar" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="date"
                                                value={formData.effectiveTo}
                                                onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-hidden transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Rates Configuration */}
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Rate Configuration Table</h3>
                                        <button
                                            type="button"
                                            onClick={addRateRow}
                                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-100 transition-all active:scale-95 border border-indigo-100 flex items-center gap-2"
                                        >
                                            <Icon name="PlusCircle" size={14} /> Row
                                        </button>
                                    </div>

                                    <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                        {formData.rates.map((rate, idx) => (
                                            <div key={idx} className="flex gap-3 items-center group">
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Description (e.g. Senior Developer)"
                                                        value={rate.description}
                                                        onChange={(e) => updateRate(idx, 'description', e.target.value)}
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden transition-all"
                                                    />
                                                </div>
                                                <div className="w-32 relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">₹</span>
                                                    <input
                                                        type="number"
                                                        placeholder="Rate"
                                                        value={rate.rate}
                                                        onChange={(e) => updateRate(idx, 'rate', e.target.value)}
                                                        className="w-full pl-7 pr-3 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden transition-all"
                                                    />
                                                </div>
                                                <div className="w-32 relative">
                                                    <select
                                                        value={rate.unit}
                                                        onChange={(e) => updateRate(idx, 'unit', e.target.value)}
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden transition-all appearance-none"
                                                    >
                                                        {UNITS.map(u => <option key={u} value={u} className="text-slate-900">{u}</option>)}
                                                    </select>
                                                    <Icon name="ChevronDown" size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeRate(idx)}
                                                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                                >
                                                    <Icon name="Trash2" size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Additional Notes</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                        placeholder="Add any specific terms or context here..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-hidden transition-all"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => { setShowCreateModal(false); setEditingCard(null); }}
                                        className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-4 bg-linear-to-br from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:shadow-purple-500/30 transition-all active:scale-95"
                                    >
                                        {editingCard ? 'Commit Update' : 'Finalize Rate Card'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
