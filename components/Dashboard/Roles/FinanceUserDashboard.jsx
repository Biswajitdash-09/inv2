"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Icon from "@/components/Icon";
import DropZone from "@/components/Dashboard/DropZone";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: (i) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }
    })
};

const STATUS_CONFIG = {
    PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    VERIFIED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
    MATCH_DISCREPANCY: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    VALIDATION_REQUIRED: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
    PENDING_APPROVAL: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
    PM_APPROVED: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
    DEFAULT: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
};

const getStatusStyle = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.DEFAULT;

const FinanceUserDashboard = ({ invoices, onUploadComplete, statusFilter = 'ALL', searchQuery = '' }) => {
    const router = useRouter();
    const [tableOpen, setTableOpen] = useState(true);

    const discrepancyCount = invoices.filter(inv => inv.status === 'MATCH_DISCREPANCY').length;
    const manualReview = invoices.filter(inv => inv.status === 'VALIDATION_REQUIRED').length;
    const readyForPayment = invoices.filter(inv => inv.status === 'APPROVED' || inv.status === 'PM_APPROVED').length;
    const totalProcessed = invoices.filter(inv => inv.status === 'PAID' || inv.status === 'APPROVED' || inv.status === 'PM_APPROVED').length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

    const filteredInvoices = invoices.filter(inv => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                inv.vendorName?.toLowerCase().includes(query) ||
                inv.invoiceNumber?.toLowerCase().includes(query) ||
                inv.id?.toLowerCase().includes(query) ||
                inv.amount?.toString().includes(query);
            if (!matchesSearch) return false;
        }
        if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
        return true;
    });

    const recentInvoices = [...filteredInvoices]
        .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
        .slice(0, 10);

    const statCards = [
        {
            title: 'Discrepancies',
            subtitle: 'Require resolution',
            value: discrepancyCount,
            icon: 'AlertTriangle',
            gradient: 'from-rose-500 to-red-600',
            shadowColor: 'shadow-rose-200',
            link: '/matching?status=MATCH_DISCREPANCY',
            urgent: true
        },
        {
            title: 'Manual Review',
            subtitle: 'Awaiting validation',
            value: manualReview,
            icon: 'FileSearch',
            gradient: 'from-amber-500 to-orange-500',
            shadowColor: 'shadow-amber-200',
            link: '/digitization?status=VALIDATION_REQUIRED'
        },
        {
            title: 'Ready for Payment',
            subtitle: 'Approved invoices',
            value: readyForPayment,
            icon: 'CheckCircle2',
            gradient: 'from-emerald-500 to-teal-600',
            shadowColor: 'shadow-emerald-200',
            link: '/approvals?status=APPROVED'
        },
        {
            title: 'Total Value',
            subtitle: 'All invoice amount',
            value: `₹${totalAmount.toLocaleString('en-IN')}`,
            icon: 'IndianRupee',
            gradient: 'from-violet-500 to-indigo-600',
            shadowColor: 'shadow-violet-200',
            isAmount: true
        }
    ];

    return (
        <div className="space-y-6 sm:space-y-8 pb-10 px-2 sm:px-4 lg:px-0">

<<<<<<< HEAD
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {statCards.map((card, i) => (
                    <motion.div
                        key={card.title}
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={fadeUp}
                        onClick={() => card.link && router.push(card.link)}
                        className={`group relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${card.gradient} text-white overflow-hidden
                            ${card.link ? 'cursor-pointer' : ''} shadow-lg ${card.shadowColor}
                            hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] transition-all duration-200`}
                    >
                        {/* Glow */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mt-6 -mr-6 blur-xl" />
                        <div className="absolute bottom-0 left-0 w-14 h-14 bg-white/10 rounded-full -mb-4 -ml-4 blur-lg" />
=======
                <Card
                    className="p-5 border-l-4 border-l-info cursor-pointer transform hover:-translate-y-1 transition-all shadow-sm hover:shadow-md"
                    onClick={() => router.push('/digitization?status=VALIDATION_REQUIRED')}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Manual Entry</p>
                            <p className="text-lg font-bold text-info mt-0.5">Review Queue</p>
                            <p className="text-3xl font-black text-slate-800 mt-2">{manualReview}</p>
                        </div>
                        <div className="bg-info/10 p-3 rounded-xl">
                            <Icon name="FileText" className="text-info" size={24} />
                        </div>
                    </div>
                </Card>

                <Card
                    className="p-5 border-l-4 border-l-success cursor-pointer transform hover:-translate-y-1 transition-all shadow-sm hover:shadow-md"
                    onClick={() => router.push('/approvals?status=APPROVED')}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Finance Ops</p>
                            <p className="text-lg font-bold text-success mt-0.5">Ready for Payment</p>
                            <p className="text-3xl font-black text-slate-800 mt-2">{readyForPayment}</p>
                        </div>
                        <div className="bg-success/10 p-3 rounded-xl">
                            <Icon name="CheckCircle" className="text-success" size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Recent Activity & Status Tracking */}
                <div className="xl:col-span-2 space-y-8">
                    <Card className="overflow-hidden border-0 shadow-lg">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Recent Invoice Activity</h3>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="font-semibold py-4 pl-6">Invoice / Vendor</th>
                                        <th className="font-semibold py-4">Amount</th>
                                        <th className="font-semibold py-4">Date</th>
                                        <th className="font-semibold py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {recentInvoices.length > 0 ? (
                                        recentInvoices.map((inv) => (
                                            <tr key={inv.id} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="pl-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 text-xs">
                                                            {inv.vendorName?.substring(0, 2).toUpperCase() || 'NA'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800">{inv.invoiceNumber || "Processing..."}</div>
                                                            <div className="text-xs text-slate-500">{inv.vendorCode && <span className="font-mono text-indigo-600 font-medium">{inv.vendorCode}</span>}{inv.vendorCode && ' · '}{inv.vendorName || "Unknown Vendor"}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="font-semibold text-slate-700">
                                                    {inv.amount ? `₹ ${Number(inv.amount).toLocaleString()}` : '-'}
                                                </td>
                                                <td className="text-slate-500 text-xs">
                                                    {inv.date || new Date().toLocaleDateString()}
                                                </td>
                                                <td>
                                                    <span className={`badge badge-sm border-0 font-bold py-3 px-3 uppercase text-[10px] tracking-wide
                                                        ${inv.status === 'PAID' || inv.status === 'APPROVED' || inv.status === 'VERIFIED' ? 'bg-success/10 text-success' :
                                                            inv.status === 'REJECTED' ? 'bg-error/10 text-error' :
                                                                inv.status === 'MATCH_DISCREPANCY' ? 'bg-warning/10 text-warning' :
                                                                    inv.status === 'VALIDATION_REQUIRED' ? 'bg-info/10 text-info' :
                                                                        inv.status === 'PENDING_APPROVAL' ? 'bg-warning/10 text-warning' :
                                                                            'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {inv.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="text-center py-10 text-slate-400 italic">
                                                No recent activity found. Upload an invoice to get started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Upload Queue & System Status */}
                <div className="space-y-6">
                    <Card className="h-auto border-0 shadow-2xl bg-linear-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white overflow-hidden relative shadow-indigo-200">
                        {/* Abstract background pattern */}
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
>>>>>>> 3fcc019224fb0e31258d3a29d65c7b1439dcb25c

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-white/70">
                                    {card.title}
                                </p>
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                                    <Icon name={card.icon} size={16} />
                                </div>
                            </div>
                            <p className={`${card.isAmount ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-black tracking-tight`}>
                                {card.value}
                            </p>
                            <p className="text-[10px] sm:text-xs font-medium text-white/60 mt-1">
                                {card.subtitle}
                            </p>
                        </div>

                        {card.urgent && card.value > 0 && (
                            <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                        )}
                    </motion.div>
                ))}
            </div>

            {/* ── Main Content Grid ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6">

                {/* Left: Invoice Table */}
                <div className="xl:col-span-2">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <Card className="p-0 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                            {/* Table Header */}
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setTableOpen(o => !o)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTableOpen(o => !o); } }}
                                className="w-full p-4 sm:p-5 flex justify-between items-center bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left border-b border-slate-100 cursor-pointer"
                            >
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <motion.span
                                        animate={{ rotate: tableOpen ? 0 : -90 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-slate-500"
                                    >
                                        <Icon name="ChevronDown" size={18} />
                                    </motion.span>
                                    <h3 className="font-bold text-sm sm:text-base text-slate-800">Recent Invoice Activity</h3>
                                    {filteredInvoices.length > 0 && (
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                                            {filteredInvoices.length}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="hidden sm:inline text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {tableOpen ? 'Collapse' : 'Expand'}
                                    </span>
                                </div>
                            </div>

                            <AnimatePresence>
                                {tableOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        className="overflow-hidden"
                                    >
                                        {/* Desktop Table */}
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="table w-full">
                                                <thead>
                                                    <tr className="bg-white text-slate-400 text-[10px] uppercase tracking-widest">
                                                        <th className="font-bold py-3 pl-5">Invoice / Vendor</th>
                                                        <th className="font-bold py-3">Amount</th>
                                                        <th className="font-bold py-3">Date</th>
                                                        <th className="font-bold py-3 pr-5">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm">
                                                    {recentInvoices.length > 0 ? (
                                                        recentInvoices.map((inv, idx) => {
                                                            const sc = getStatusStyle(inv.status);
                                                            return (
                                                                <motion.tr
                                                                    key={inv.id}
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    transition={{ delay: idx * 0.03 }}
                                                                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                                                                >
                                                                    <td className="pl-5 py-3.5">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center font-bold text-indigo-600 text-[10px] border border-indigo-100/60 shrink-0">
                                                                                {inv.vendorName?.substring(0, 2).toUpperCase() || 'NA'}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="font-bold text-slate-800 text-sm truncate">{inv.invoiceNumber || "Processing..."}</div>
                                                                                <div className="text-[10px] text-slate-400 truncate">
                                                                                    {inv.vendorCode && <span className="font-mono text-indigo-500 font-semibold">{inv.vendorCode}</span>}
                                                                                    {inv.vendorCode && ' · '}
                                                                                    {inv.vendorName || "Unknown Vendor"}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="font-bold text-slate-700 text-sm">
                                                                        {inv.amount ? `₹${Number(inv.amount).toLocaleString('en-IN')}` : '—'}
                                                                    </td>
                                                                    <td className="text-slate-400 text-xs">
                                                                        {inv.date || new Date(inv.created_at).toLocaleDateString('en-IN')}
                                                                    </td>
                                                                    <td className="pr-5">
                                                                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg ${sc.bg} ${sc.text}`}>
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                                            {inv.status?.replace(/_/g, ' ')}
                                                                        </span>
                                                                    </td>
                                                                </motion.tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="4" className="text-center py-12">
                                                                <div className="flex flex-col items-center gap-3">
                                                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                                                                        <Icon name="Inbox" size={24} className="text-slate-300" />
                                                                    </div>
                                                                    <p className="text-sm font-medium text-slate-400">No invoices found</p>
                                                                    <p className="text-xs text-slate-300">Upload an invoice to get started</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Card List */}
                                        <div className="sm:hidden divide-y divide-slate-100">
                                            {recentInvoices.length > 0 ? (
                                                recentInvoices.map((inv) => {
                                                    const sc = getStatusStyle(inv.status);
                                                    return (
                                                        <div key={inv.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center font-bold text-indigo-600 text-[10px] border border-indigo-100/60 shrink-0">
                                                                        {inv.vendorName?.substring(0, 2).toUpperCase() || 'NA'}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-bold text-slate-800 text-sm truncate">{inv.invoiceNumber || "Processing..."}</p>
                                                                        <p className="text-[10px] text-slate-400 truncate">{inv.vendorName || "Unknown Vendor"}</p>
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm font-bold text-slate-700 shrink-0">
                                                                    {inv.amount ? `₹${Number(inv.amount).toLocaleString('en-IN')}` : '—'}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-2.5 pl-12">
                                                                <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${sc.bg} ${sc.text}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                                    {inv.status?.replace(/_/g, ' ')}
                                                                </span>
                                                                <span className="text-[10px] text-slate-300">
                                                                    {inv.date || new Date(inv.created_at).toLocaleDateString('en-IN')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-10 text-center">
                                                    <Icon name="Inbox" size={28} className="text-slate-200 mx-auto mb-2" />
                                                    <p className="text-sm text-slate-400">No invoices found</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Card>
                    </motion.div>
                </div>

                {/* Right Column: Upload & Quick Actions */}
                <div className="space-y-5">
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                        <Card className="h-auto border-0 shadow-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white overflow-hidden relative shadow-indigo-200/50 rounded-2xl">
                            {/* Decorative blurs */}
                            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-white/8 rounded-full blur-2xl" />
                            <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-28 h-28 bg-white/8 rounded-full blur-2xl" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                                        <Icon name="UploadCloud" size={16} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">Quick Ingestion</h3>
                                        <p className="text-[10px] text-indigo-200 font-medium">Drop files to start OCR</p>
                                    </div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-1 backdrop-blur-sm">
                                    <DropZone onUploadComplete={onUploadComplete} theme="dark" />
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                        <Card className="p-5 border border-slate-100 shadow-sm rounded-2xl bg-white">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h3>
                            <div className="space-y-2.5">
                                {[
                                    { label: 'Manual Invoice Entry', desc: 'Create record without file', icon: 'PlusCircle', link: '/finance/manual-entry', color: 'indigo' },
                                    { label: 'Matching Engine', desc: 'Review 3-way matches', icon: 'GitCompare', link: '/matching', color: 'violet' },
                                    { label: 'Audit Logs', desc: 'View activity trail', icon: 'ScrollText', link: '/audit', color: 'slate' },
                                ].map((action) => (
                                    <button
                                        key={action.label}
                                        onClick={() => router.push(action.link)}
                                        className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl bg-${action.color}-50 text-${action.color}-600 flex items-center justify-center group-hover:bg-${action.color}-600 group-hover:text-white transition-colors`}>
                                                <Icon name={action.icon} size={16} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-slate-700">{action.label}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{action.desc}</p>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Pipeline Summary */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
                        <Card className="p-5 border border-slate-100 shadow-sm rounded-2xl bg-white">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pipeline Summary</h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Total Invoices', value: invoices.length, icon: 'FileStack', color: 'text-indigo-600 bg-indigo-50' },
                                    { label: 'Total Processed', value: totalProcessed, icon: 'BadgeCheck', color: 'text-emerald-600 bg-emerald-50' },
                                    { label: 'Pending Actions', value: discrepancyCount + manualReview, icon: 'Clock', color: 'text-amber-600 bg-amber-50' },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center`}>
                                                <Icon name={item.icon} size={14} />
                                            </div>
                                            <p className="text-xs font-medium text-slate-500">{item.label}</p>
                                        </div>
                                        <p className="text-sm font-black text-slate-800">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default FinanceUserDashboard;
