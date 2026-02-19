"use client";

import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import clsx from "clsx";

export default function ActiveRates({ rateCards, loading }) {
    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-pulse">
                <div className="h-6 w-48 bg-slate-100 rounded mb-6" />
                <div className="space-y-4">
                    <div className="h-20 bg-slate-50 rounded-2xl" />
                    <div className="h-20 bg-slate-50 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!rateCards || rateCards.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Icon name="FileText" size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">No Active Rates</h3>
                <p className="text-sm text-slate-400 mt-2 font-medium">Contact your administrator to assign a rate card.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                            <Icon name="TrendingUp" size={20} />
                        </div>
                        Active Rates
                    </h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Verified Rates for your services</p>
                </div>
                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rateCards.map((card, idx) => (
                    <motion.div
                        key={card._id || idx}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-6 rounded-3xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-all group flex flex-col justify-between"
                    >
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
                            <div className="min-w-0 flex-1">
                                <h4 className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors truncate" title={card.projectId ? card.projectName || card.projectId : 'Global Rate Card'}>
                                    {card.projectId ? `Project: ${card.projectName || card.projectId}` : 'Global Rate Card'}
                                </h4>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: Active</p>
                            </div>
                            <div className="text-left sm:text-right shrink-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Effective From</p>
                                <p className="text-[10px] font-black text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-100 inline-block">
                                    {new Date(card.effectiveFrom).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {card.rates.map((rate, rIdx) => (
                                <div key={rIdx} className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 flex-grow sm:flex-grow-0">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 truncate">{rate.role}</p>
                                        <p className="text-xs font-black text-slate-700 leading-none truncate">{rate.experienceRange}</p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-100 shrink-0" />
                                    <div className="shrink-0">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1.5">{rate.unit}</p>
                                        <p className="text-xs font-black text-slate-900 leading-none">₹{rate.rate}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            <button
                onClick={() => window.location.href = '/vendors/rate-cards'}
                className="w-full mt-6 py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-2"
            >
                View Detailed Directory <Icon name="ChevronRight" size={14} />
            </button>
        </div>
    );
}
