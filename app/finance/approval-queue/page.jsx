'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { useAuth } from '@/context/AuthContext';
import DocumentViewer from '@/components/ui/DocumentViewer';
import { INVOICE_STATUS } from '@/lib/invoice-workflow';

const STATUS_STYLES = {
    [INVOICE_STATUS.PENDING_FINANCE_REVIEW]: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'PM Approved' },
    [INVOICE_STATUS.FINANCE_APPROVED]: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Finance Approved' },
    [INVOICE_STATUS.FINANCE_REJECTED]: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Finance Rejected' },
    [INVOICE_STATUS.PENDING_PM_APPROVAL]: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Pending PM Review' },
    [INVOICE_STATUS.PM_REJECTED]: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', label: 'PM Rejected' },
    [INVOICE_STATUS.MORE_INFO_NEEDED]: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'More Info Needed' },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
    Verified: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Verified' },
    PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Paid' },
    PM_APPROVED: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500', label: 'PM Approved' },
    REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Rejected' },
    MATCH_DISCREPANCY: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Discrepancy' },
    VALIDATION_REQUIRED: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500', label: 'Needs Validation' },
    PENDING: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', label: 'Pending' },
    manually_submitted: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Manually Submitted' },
    RECEIVED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Received' },
};
const getStatus = (s) => STATUS_STYLES[s] || { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: s?.replace(/_/g, ' ') || '—' };

export default function FinanceApprovalQueuePage() {
    const { user } = useAuth();
    const [allInvoices, setAllInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Action states
    const [processingId, setProcessingId] = useState(null);
    const [actionModal, setActionModal] = useState(null); // { invoice, type: 'approve'|'reject' }
    const [notes, setNotes] = useState('');

    // Document viewer
    const [viewerInvoice, setViewerInvoice] = useState(null);
    const [spreadsheetData, setSpreadsheetData] = useState(null);

    // Filter
    const [activeTab, setActiveTab] = useState('pending'); // pending | approved | rejected | all

    useEffect(() => {
        fetchInvoices();
    }, []);

    // Load CSV/XLS/XLSX preview data (like Vendor view)
    useEffect(() => {
        if (!viewerInvoice) {
            setSpreadsheetData(null);
            return;
        }

        const fileName = (viewerInvoice.originalName || '').toLowerCase();
        const isSpreadsheet =
            fileName.endsWith('.xls') ||
            fileName.endsWith('.xlsx') ||
            fileName.endsWith('.csv');

        if (!isSpreadsheet) {
            setSpreadsheetData(null);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(`/api/invoices/${viewerInvoice.id}/preview`, { cache: 'no-store' });
                const data = await res.json();
                if (!cancelled && Array.isArray(data?.data)) {
                    setSpreadsheetData(data.data);
                }
            } catch (err) {
                console.error('Failed to fetch spreadsheet preview for finance viewer:', err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [viewerInvoice]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/invoices?t=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAllInvoices(Array.isArray(data) ? data : (data.invoices || []));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    // Tab-based filtering
    const filteredInvoices = useMemo(() => {
        switch (activeTab) {
            case 'pending':
                return allInvoices.filter(inv =>
                    !inv.financeApproval?.status ||
                    inv.financeApproval?.status === 'PENDING' ||
                    inv.status === 'PENDING' ||
                    inv.status === INVOICE_STATUS.PENDING_FM_APPROVAL ||
                    inv.status === 'VERIFIED' ||
                    inv.status === 'RECEIVED'
                );
            case 'approved':
                return allInvoices.filter(inv =>
                    inv.financeApproval?.status === 'APPROVED' ||
                    inv.status === INVOICE_STATUS.PENDING_FM_APPROVAL ||
                    inv.status === 'APPROVED' ||
                    inv.status === 'PM_APPROVED' ||
                    inv.status === 'PAID'
                );
            case 'rejected':
                return allInvoices.filter(inv =>
                    inv.financeApproval?.status === 'REJECTED' ||
                    inv.status === 'Rejected'
                );
            default:
                return allInvoices;
        }
    }, [allInvoices, activeTab]);

    const pendingCount = allInvoices.filter(inv =>
        !inv.financeApproval?.status || inv.financeApproval?.status === 'PENDING' ||
        inv.status === 'PENDING' || inv.status === INVOICE_STATUS.PENDING_FM_APPROVAL ||
        inv.status === 'VERIFIED' || inv.status === 'RECEIVED'
    ).length;
    const approvedCount = allInvoices.filter(inv =>
        inv.financeApproval?.status === 'APPROVED'
    ).length;
    const rejectedCount = allInvoices.filter(inv =>
        inv.financeApproval?.status === 'REJECTED'
    ).length;

    const handleApprove = async (invoiceId) => {
        try {
            setProcessingId(invoiceId);
            const res = await fetch(`/api/finance/approve/${invoiceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'APPROVE', notes })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setActionModal(null);
            setNotes('');
            setSuccessMsg('Invoice approved and ready for payment!');
            setTimeout(() => setSuccessMsg(null), 4000);
            fetchInvoices();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (invoiceId) => {
        if (!notes.trim()) {
            setError('Please provide a reason for rejecting this invoice.');
            return;
        }
        try {
            setProcessingId(invoiceId);
            const res = await fetch(`/api/finance/approve/${invoiceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REJECT', notes })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setActionModal(null);
            setNotes('');
            setSuccessMsg('Invoice rejected. The vendor has been notified.');
            setTimeout(() => setSuccessMsg(null), 4000);
            fetchInvoices();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const TAB_COLORS = {
        pending: { active: 'bg-indigo-50 text-indigo-700 border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
        approved: { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
        rejected: { active: 'bg-rose-50 text-rose-700 border-rose-200', badge: 'bg-rose-100 text-rose-700' },
        all: { active: 'bg-slate-100 text-slate-700 border-slate-200', badge: 'bg-slate-200 text-slate-700' },
    };

    const tabs = [
        { key: 'pending', label: 'Pending Review', count: pendingCount, icon: 'Clock' },
        { key: 'approved', label: 'Approved', count: approvedCount, icon: 'CheckCircle2' },
        { key: 'rejected', label: 'Rejected', count: rejectedCount, icon: 'XCircle' },
        { key: 'all', label: 'All', count: allInvoices.length, icon: 'LayoutList' },
    ];

    return (
        <div className="space-y-6 pb-10">
            {/* Alerts */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium"
                    >
                        <Icon name="AlertCircle" size={18} />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="w-6 h-6 rounded-lg hover:bg-rose-100 flex items-center justify-center">
                            <Icon name="X" size={14} />
                        </button>
                    </motion.div>
                )}
                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium"
                    >
                        <Icon name="CheckCircle2" size={18} />
                        <span className="flex-1">{successMsg}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {tabs.map((tab) => {
                    const colors = TAB_COLORS[tab.key];
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${activeTab === tab.key
                                ? `${colors.active} shadow-sm`
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-transparent'
                                }`}
                        >
                            <Icon name={tab.icon} size={16} />
                            {tab.label}
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.key
                                ? colors.badge
                                : 'bg-slate-100 text-slate-400'
                                }`}>{tab.count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Invoice Cards */}
            <div className="space-y-3">
                {loading ? (
                    <div className="rounded-2xl border border-slate-100 bg-white p-16 text-center">
                        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm text-slate-400 font-medium">Loading your approval queue...</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="rounded-2xl border border-slate-100 bg-white p-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                            <Icon name={activeTab === 'pending' ? 'CheckCircle' : 'Inbox'} size={28} className="text-slate-300" />
                        </div>
                        <p className="text-base font-bold text-slate-400">
                            {activeTab === 'pending' ? 'All caught up!' : 'No invoices here'}
                        </p>
                        <p className="text-xs text-slate-300 mt-1">
                            {activeTab === 'pending'
                                ? 'No invoices pending your review right now.'
                                : `No ${activeTab === 'all' ? '' : activeTab} invoices found.`}
                        </p>
                    </div>
                ) : (
                    filteredInvoices.map((inv, idx) => {
                        const sc = getStatus(inv.status);
                        const isPending = !inv.financeApproval?.status || inv.financeApproval?.status === 'PENDING';
                        return (
                            <motion.div
                                key={inv.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
                            >
                                {/* Card Content */}
                                <div className="p-4 sm:p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        {/* Left: Invoice Info */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100/50 flex items-center justify-center font-bold text-indigo-600 text-xs shrink-0">
                                                {inv.vendorName?.substring(0, 2).toUpperCase() || 'NA'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-slate-800 text-sm">{inv.invoiceNumber || inv.id?.slice(0, 8)}</p>
                                                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${sc.bg} ${sc.text}`}>
                                                        <span className={`w-1 h-1 rounded-full ${sc.dot}`} />
                                                        {sc.label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                                                    <span className="font-medium text-slate-500">{inv.vendorName || 'Unknown Vendor'}</span>
                                                    {inv.vendorCode && (
                                                        <>
                                                            <span>·</span>
                                                            <span className="font-mono text-indigo-500 font-semibold">{inv.vendorCode}</span>
                                                        </>
                                                    )}
                                                    {inv.date && (
                                                        <>
                                                            <span>·</span>
                                                            <span>{inv.date}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Amount */}
                                        <p className="text-lg sm:text-xl font-black text-slate-800 shrink-0 pl-13 sm:pl-0">
                                            ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>

                                    {/* Meta Tags Row */}
                                    {(inv.project || inv.poNumber || inv.costCenter || inv.financeApproval?.notes || inv.originalName) && (
                                        <div className="flex flex-wrap items-center gap-2 mt-3 pl-13 sm:pl-14">
                                            {inv.originalName && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                                    <Icon name="FileText" size={10} /> {inv.originalName}
                                                </span>
                                            )}
                                            {inv.project && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                                    <Icon name="FolderOpen" size={10} /> {inv.project}
                                                </span>
                                            )}
                                            {inv.poNumber && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                                    <Icon name="Hash" size={10} /> PO: {inv.poNumber}
                                                </span>
                                            )}
                                            {inv.costCenter && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                                    <Icon name="MapPin" size={10} /> {inv.costCenter}
                                                </span>
                                            )}
                                            {inv.financeApproval?.status === 'APPROVED' && inv.assignedFinanceUser && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                                                    <Icon name="CheckCircle2" size={10} /> Approved by Finance
                                                </span>
                                            )}
                                            {inv.financeApproval?.status === 'REJECTED' && inv.financeApproval?.notes && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg max-w-xs truncate">
                                                    <Icon name="MessageSquare" size={10} /> {inv.financeApproval.notes}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action Bar */}
                                <div className="px-4 sm:px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                    {/* Left: Document Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setViewerInvoice(inv)}
                                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                                        >
                                            <Icon name="Eye" size={14} />
                                            <span className="hidden xs:inline">View Doc</span>
                                        </button>
                                        <a
                                            href={`/api/invoices/${inv.id}/file`}
                                            download={inv.originalName || `invoice-${inv.id}`}
                                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all"
                                        >
                                            <Icon name="Download" size={14} />
                                            <span className="hidden xs:inline">Download</span>
                                        </a>
                                    </div>

                                    {/* Right: Approve/Reject or Status */}
                                    <div className="flex items-center gap-2">
                                        {isPending ? (
                                            <>
                                                <button
                                                    onClick={() => setActionModal({ invoice: inv, type: 'approve' })}
                                                    disabled={processingId === inv.id}
                                                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all disabled:opacity-50"
                                                >
                                                    <Icon name="CheckCircle2" size={14} />
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => setActionModal({ invoice: inv, type: 'reject' })}
                                                    disabled={processingId === inv.id}
                                                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all disabled:opacity-50"
                                                >
                                                    <Icon name="XCircle" size={14} />
                                                    Reject
                                                </button>
                                            </>
                                        ) : (
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg ${inv.financeApproval?.status === 'APPROVED'
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : inv.financeApproval?.status === 'REJECTED'
                                                    ? 'bg-rose-50 text-rose-600'
                                                    : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                <Icon name={inv.financeApproval?.status === 'APPROVED' ? 'CheckCircle2' : inv.financeApproval?.status === 'REJECTED' ? 'XCircle' : 'Clock'} size={12} />
                                                {inv.financeApproval?.status === 'APPROVED' ? 'Accepted by you' : inv.financeApproval?.status === 'REJECTED' ? 'Rejected by you' : 'Pending'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* ── Approve Modal (with PM selection) ── */}
            <AnimatePresence>
                {actionModal?.type === 'approve' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => { setActionModal(null); setNotes(''); setError(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100 bg-emerald-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                        <Icon name="CheckCircle2" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800 text-lg">Approve Invoice for Payment</h2>
                                        <p className="text-xs text-slate-400">This invoice has passed all reviews and is ready for payment processing</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Invoice Summary */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{actionModal.invoice.invoiceNumber || actionModal.invoice.id?.slice(0, 8)}</p>
                                            <p className="text-xs text-slate-400">{actionModal.invoice.vendorName}{actionModal.invoice.vendorCode ? ` · ${actionModal.invoice.vendorCode}` : ''}</p>
                                        </div>
                                        <p className="text-lg font-black text-slate-800">₹{Number(actionModal.invoice.amount || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Notes (optional)</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all resize-none"
                                        placeholder="Add any notes for the record..."
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-5 pb-5 flex gap-3">
                                <button
                                    onClick={() => { setActionModal(null); setNotes(''); setError(null); }}
                                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleApprove(actionModal.invoice.id)}
                                    disabled={processingId}
                                    className="flex-1 px-4 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processingId ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                                    ) : (
                                        <><Icon name="CheckCircle2" size={16} /> Approve for Payment</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Reject Modal ── */}
            <AnimatePresence>
                {actionModal?.type === 'reject' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => { setActionModal(null); setNotes(''); setError(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100 bg-rose-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                                        <Icon name="XCircle" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800 text-lg">Reject Invoice</h2>
                                        <p className="text-xs text-slate-400">The vendor will be notified about this rejection</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Invoice Summary */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{actionModal.invoice.invoiceNumber || actionModal.invoice.id?.slice(0, 8)}</p>
                                            <p className="text-xs text-slate-400">{actionModal.invoice.vendorName}{actionModal.invoice.vendorCode ? ` · ${actionModal.invoice.vendorCode}` : ''}</p>
                                        </div>
                                        <p className="text-lg font-black text-slate-800">₹{Number(actionModal.invoice.amount || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>

                                {/* Rejection Reason */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                        Reason for Rejection <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all resize-none"
                                        placeholder="Explain why this invoice is being rejected..."
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">This message will be visible to the vendor.</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-5 pb-5 flex gap-3">
                                <button
                                    onClick={() => { setActionModal(null); setNotes(''); setError(null); }}
                                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleReject(actionModal.invoice.id)}
                                    disabled={processingId || !notes.trim()}
                                    className="flex-1 px-4 py-3 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processingId ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                                    ) : (
                                        <><Icon name="XCircle" size={16} /> Reject & Notify Vendor</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Document Viewer Modal ── */}
            <AnimatePresence>
                {viewerInvoice && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setViewerInvoice(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
                        >
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">{viewerInvoice.originalName || viewerInvoice.invoiceNumber || 'Document'}</h3>
                                    <p className="text-[10px] text-slate-400">{viewerInvoice.vendorName}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={`/api/invoices/${viewerInvoice.id}/file`}
                                        download={viewerInvoice.originalName || `invoice-${viewerInvoice.id}`}
                                        className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all inline-flex items-center gap-1.5"
                                    >
                                        <Icon name="Download" size={14} />
                                        Download
                                    </a>
                                    <button
                                        onClick={() => setViewerInvoice(null)}
                                        className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                                    >
                                        <Icon name="X" size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-100 relative min-h-[60vh] max-h-[80vh] overflow-y-auto">
                                <DocumentViewer
                                    invoiceId={viewerInvoice.id}
                                    fileName={viewerInvoice.originalName}
                                    spreadsheetData={spreadsheetData}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
