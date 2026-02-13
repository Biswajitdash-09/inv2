'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/Layout/PageHeader';
import Card from '@/components/ui/Card';
import Icon from '@/components/Icon';

export default function RateCardViewPage() {
    const [ratecards, setRatecards] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterVendor, setFilterVendor] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

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

    return (
        <div className="px-4 sm:px-8 py-6 sm:py-8 min-h-screen">
            <PageHeader
                title="Rate Cards"
                subtitle="View approved vendor service rates"
                icon="Layers"
                accent="indigo"
            />

            <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
                {/* Filters */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-3 sm:p-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                        <div className="relative w-full sm:w-64">
                            <Icon name="Building" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <select
                                value={filterVendor}
                                onChange={(e) => setFilterVendor(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-100 rounded-xl text-slate-700 font-bold text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
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
                                className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-100 rounded-xl text-slate-700 font-bold text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                            >
                                <option value="">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="EXPIRED">Expired</option>
                            </select>
                        </div>
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
                        <span className="loading loading-spinner h-8 w-8 text-indigo-600"></span>
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
                                <Card className="h-full hover:shadow-xl hover:shadow-indigo-500/5 transition-all border-slate-200/60 p-6 flex flex-col">
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
                                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                                {card.rates.map((rate, i) => (
                                                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-50/50 border border-slate-100/50">
                                                        <span className="text-xs font-bold text-slate-600 truncate mr-2" title={rate.description}>{rate.description}</span>
                                                        <span className="text-xs font-black text-indigo-600 shrink-0">₹ {rate.rate}/{rate.unit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {card.notes && (
                                            <div className="pt-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Notes</p>
                                                <p className="text-xs text-slate-500 line-clamp-2" title={card.notes}>{card.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {!loading && ratecards.length === 0 && (
                    <Card className="text-center py-20 flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                            <Icon name="Layers" size={32} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">No Rate Cards Found</h3>
                        <p className="text-slate-500 text-sm mt-1 max-w-xs font-medium">No active rate cards are currently available for review.</p>
                    </Card>
                )}
            </div>
        </div>
    );
}
