"use client";

import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/Icon";
import { getRateCards } from "@/lib/api";
import PageHeader from "@/components/Layout/PageHeader";
import { motion } from "framer-motion";

export default function FinanceRateCards() {
    const [rateCards, setRateCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const data = await getRateCards();
                setRateCards(data.rateCards || []);
            } catch (err) {
                console.error("Failed to fetch rate cards", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRates();
    }, []);

    const filteredCards = rateCards.filter(card =>
        (card.projectName || "").toLowerCase().includes(filter.toLowerCase()) ||
        (card._id || "").toLowerCase().includes(filter.toLowerCase())
    );

    const stats = useMemo(() => {
        const total = filteredCards.length;
        const totalRates = filteredCards.reduce((s, c) => s + (c.rates?.length || 0), 0);
        const active = filteredCards.filter(c => c.status === 'ACTIVE').length;
        return { total, totalRates, active };
    }, [filteredCards]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
            <PageHeader
                title="Rate Card Directory"
                subtitle="Centralized repository of all active vendor rate cards for financial verification."
                icon="ShieldCheck"
                accent="indigo"
                roleLabel="Finance"
                actions={
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filter projects..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none w-64 transition-all"
                            />
                            {filter && (
                                <button onClick={() => setFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <Icon name="X" size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                }
            />

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="inline-flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-400/20 rounded-full blur-xl animate-pulse" />
                            <span className="loading loading-spinner loading-lg text-indigo-600 relative z-10"></span>
                        </div>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Loading rate cards...</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Stats Bar */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Cards Found', value: stats.total, icon: 'Layers', gradient: 'from-indigo-600 to-blue-600', shadow: 'shadow-indigo-500/20' },
                            { label: 'Active', value: stats.active, icon: 'CheckCircle', gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
                            { label: 'Total Rates', value: stats.totalRates, icon: 'TrendingUp', gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/40 shadow-lg p-4 flex items-center gap-3.5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                            >
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} ${stat.shadow} shadow-lg flex items-center justify-center shrink-0`}>
                                    <Icon name={stat.icon} size={20} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-slate-800 leading-none tracking-tight">{stat.value}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Filter indicator */}
                    {filter && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-indigo-50/80 border border-indigo-100 rounded-xl px-4 py-2.5 flex items-center justify-between"
                        >
                            <p className="text-xs font-bold text-indigo-600">
                                Showing {filteredCards.length} of {rateCards.length} rate cards matching &ldquo;{filter}&rdquo;
                            </p>
                            <button onClick={() => setFilter('')} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 underline transition-colors">Clear</button>
                        </motion.div>
                    )}

                    {filteredCards.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/40 shadow-lg p-12 text-center flex flex-col items-center"
                        >
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-indigo-300 border border-indigo-100/50 shadow-inner">
                                <Icon name="Search" size={36} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">No Rate Cards Found</h3>
                            <p className="text-slate-400 mt-2 text-sm max-w-sm font-medium leading-relaxed">
                                Try adjusting your filters or contact an administrator.
                            </p>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {filteredCards.map((card, idx) => (
                                <motion.div
                                    key={card._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.06, type: 'spring', stiffness: 260, damping: 20 }}
                                    className="group"
                                >
                                    <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                                        {/* Accent Strip */}
                                        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />

                                        {/* Card Header */}
                                        <div className="p-5 pb-3 flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-100/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                    <Icon name="ShieldCheck" size={18} className="text-indigo-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-slate-800 text-sm tracking-tight group-hover:text-indigo-700 transition-colors truncate leading-tight">
                                                        {card.projectName || "Global Rate Card"}
                                                    </h3>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate">
                                                        Vendor: {card.vendorId} {card.projectId && `• Project ID: ${card.projectId}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60 ring-1 ring-indigo-500/20 shrink-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                {card.status}
                                            </span>
                                        </div>

                                        {/* Rate Items */}
                                        <div className="px-5 pb-2">
                                            <div className="bg-slate-50/80 rounded-xl border border-slate-100/80 overflow-hidden">
                                                {/* Table Header */}
                                                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/60 border-b border-slate-100">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Role / Experience</p>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Rate</p>
                                                </div>
                                                {card.rates.map((rate, rIdx) => (
                                                    <div key={rIdx} className={`flex items-center justify-between p-3.5 border-b border-slate-100/60 last:border-0 hover:bg-white/60 transition-colors ${rIdx % 2 !== 0 ? 'bg-slate-50/40' : ''}`}>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 truncate">{rate.role}</p>
                                                            <p className="text-xs font-bold text-slate-600 leading-none">{rate.experienceRange}</p>
                                                        </div>
                                                        <div className="text-right shrink-0 ml-3">
                                                            <p className="text-sm font-black text-indigo-600 leading-none mb-0.5">₹{Number(rate.rate).toLocaleString()} / {rate.unit}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold leading-none">Standard Rate</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="mx-5 mb-5 mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Effective Dates</p>
                                                <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                                                    {new Date(card.effectiveFrom).toLocaleDateString()}
                                                    {card.effectiveTo ? ` — ${new Date(card.effectiveTo).toLocaleDateString()}` : ' (No Expiry)'}
                                                </p>
                                            </div>
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all cursor-pointer">
                                                <Icon name="ExternalLink" size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
