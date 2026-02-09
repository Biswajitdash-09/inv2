'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
            rates: card.rates.length ? card.rates : [{ description: '', unit: 'HOUR', rate: '', currency: 'INR' }]
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
        newRates[idx][field] = value;
        setFormData({ ...formData, rates: newRates });
    };

    const removeRate = (idx) => {
        setFormData({
            ...formData,
            rates: formData.rates.filter((_, i) => i !== idx)
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-white mb-2">Rate Card Management</h1>
                    <p className="text-gray-400">Define standard rates with vendors</p>
                </motion.div>

                {/* Filters & Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/10"
                >
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex flex-wrap gap-4">
                            <select
                                value={filterVendor}
                                onChange={(e) => setFilterVendor(e.target.value)}
                                className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">All Vendors</option>
                                {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="EXPIRED">Expired</option>
                                <option value="DRAFT">Draft</option>
                            </select>
                        </div>
                        <button
                            onClick={() => { resetForm(); setShowCreateModal(true); }}
                            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/25"
                        >
                            + Create Rate Card
                        </button>
                    </div>
                </motion.div>

                {/* Error Display */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-6"
                        >
                            {error}
                            <button onClick={() => setError(null)} className="float-right">×</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Rate Cards Grid */}
                {loading ? (
                    <div className="text-center text-gray-400 py-12">Loading rate cards...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ratecards.map((card, idx) => (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{card.name}</h3>
                                        <p className="text-sm text-gray-400">{card.vendorName}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${card.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' :
                                            card.status === 'EXPIRED' ? 'bg-red-500/20 text-red-300' :
                                                'bg-yellow-500/20 text-yellow-300'
                                        }`}>
                                        {card.status}
                                    </span>
                                </div>

                                <div className="text-sm text-gray-300 mb-4">
                                    <p>Effective: {new Date(card.effectiveFrom).toLocaleDateString()}</p>
                                    {card.effectiveTo && (
                                        <p>Until: {new Date(card.effectiveTo).toLocaleDateString()}</p>
                                    )}
                                </div>

                                <div className="border-t border-white/10 pt-4 mb-4">
                                    <p className="text-xs text-gray-400 mb-2">Rates ({card.rates.length})</p>
                                    <div className="space-y-1 max-h-24 overflow-y-auto">
                                        {card.rates.slice(0, 3).map((rate, i) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span className="text-gray-300 truncate">{rate.description}</span>
                                                <span className="text-white font-medium">₹{rate.rate}/{rate.unit}</span>
                                            </div>
                                        ))}
                                        {card.rates.length > 3 && (
                                            <p className="text-xs text-gray-500">+{card.rates.length - 3} more</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditModal(card)}
                                        className="flex-1 px-3 py-2 text-sm text-blue-400 border border-blue-400/30 rounded-lg hover:bg-blue-400/10 transition-colors"
                                    >
                                        Edit
                                    </button>
                                    {card.status !== 'EXPIRED' && (
                                        <button
                                            onClick={() => handleArchive(card)}
                                            className="flex-1 px-3 py-2 text-sm text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors"
                                        >
                                            Archive
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {!loading && ratecards.length === 0 && (
                    <div className="text-center text-gray-400 py-12">No rate cards found</div>
                )}

                {/* Create/Edit Modal */}
                <AnimatePresence>
                    {(showCreateModal || editingCard) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => { setShowCreateModal(false); setEditingCard(null); }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-800/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-2xl border border-white/20 max-h-[90vh] overflow-y-auto"
                            >
                                <h2 className="text-2xl font-bold text-white mb-6">
                                    {editingCard ? 'Edit Rate Card' : 'Create New Rate Card'}
                                </h2>
                                <form onSubmit={editingCard ? handleUpdateRatecard : handleCreateRatecard} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Vendor</label>
                                            <select
                                                value={formData.vendorId}
                                                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                                                required
                                                disabled={!!editingCard}
                                                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                                            >
                                                <option value="">Select Vendor</option>
                                                {vendors.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Rate Card Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Effective From</label>
                                            <input
                                                type="date"
                                                value={formData.effectiveFrom}
                                                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                                                required
                                                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Effective To (Optional)</label>
                                            <input
                                                type="date"
                                                value={formData.effectiveTo}
                                                onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                                                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Rates Table */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Rates</label>
                                        <div className="space-y-2">
                                            {formData.rates.map((rate, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <input
                                                        type="text"
                                                        placeholder="Description"
                                                        value={rate.description}
                                                        onChange={(e) => updateRate(idx, 'description', e.target.value)}
                                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Rate"
                                                        value={rate.rate}
                                                        onChange={(e) => updateRate(idx, 'rate', e.target.value)}
                                                        className="w-24 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    />
                                                    <select
                                                        value={rate.unit}
                                                        onChange={(e) => updateRate(idx, 'unit', e.target.value)}
                                                        className="w-28 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    >
                                                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRate(idx)}
                                                        className="p-2 text-red-400 hover:text-red-300"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addRateRow}
                                            className="mt-2 text-sm text-purple-400 hover:text-purple-300"
                                        >
                                            + Add Rate
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            rows={2}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => { setShowCreateModal(false); setEditingCard(null); }}
                                            className="flex-1 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                                        >
                                            {editingCard ? 'Update' : 'Create'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
