'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '@/components/Icon';
import { useAuth } from '@/context/AuthContext';
import { INVOICE_STATUS } from '@/lib/invoice-workflow';
import DocumentViewer from '@/components/ui/DocumentViewer';

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_STYLES = {
    [INVOICE_STATUS.PENDING_PM_APPROVAL]: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Pending Your Review' },
    [INVOICE_STATUS.PENDING_FINANCE_REVIEW]: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'PM Approved' },
    [INVOICE_STATUS.FINANCE_APPROVED]: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Fully Approved' },
    [INVOICE_STATUS.PM_REJECTED]: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', label: 'PM Rejected' },
    [INVOICE_STATUS.FINANCE_REJECTED]: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Finance Rejected' },
    [INVOICE_STATUS.MORE_INFO_NEEDED]: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'More Info Requested' },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
    REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Rejected' },
    Submitted: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Submitted' },
    PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Paid' },
};
const getStatus = (s) => STATUS_STYLES[s] || { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: s?.replace(/_/g, ' ') || '—' };

const PM_DOC_TYPES = ['Invoice', 'Ringi', 'Annexure', 'Timesheet', 'Rate Card', 'Other'];
const mapDocTypeToApi = (t) => ({ Invoice: 'INVOICE', Ringi: 'RINGI', Annexure: 'ANNEX', Timesheet: 'TIMESHEET', 'Rate Card': 'RATE_CARD', Other: 'OTHER' }[t] || 'ANNEX');

/* ─── Section wrapper ─────────────────────────────────────── */
function Section({ title, icon, children, accent = 'indigo' }) {
    const colors = { indigo: 'text-indigo-600 bg-indigo-50', emerald: 'text-emerald-600 bg-emerald-50', violet: 'text-violet-600 bg-violet-50', amber: 'text-amber-600 bg-amber-50', sky: 'text-sky-600 bg-sky-50' };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/60">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors[accent]}`}>
                    <Icon name={icon} size={14} />
                </div>
                <h3 className="font-bold text-slate-700 text-sm">{title}</h3>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function KV({ label, value, mono = false }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className={`text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function PMApprovalQueuePage() {
    const { user } = useAuth();
    const [allInvoices, setAllInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [activeTab, setActiveTab] = useState('pending');

    // Review drawer
    const [reviewInvoice, setReviewInvoice] = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Actions
    const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | 'recheck'
    const [actionNotes, setActionNotes] = useState('');
    const [processingId, setProcessingId] = useState(null);

    // PM document upload table
    const [pmDocs, setPmDocs] = useState([]);
    const [uploadingIdx, setUploadingIdx] = useState(null);

    // Inline document viewer
    const [docViewer, setDocViewer] = useState(null);
    const [spreadsheetData, setSpreadsheetData] = useState(null);

    useEffect(() => { fetchInvoices(); }, []);

    // Esc key closes viewer first, then drawer
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') { if (docViewer) setDocViewer(null); else closeDrawer(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [docViewer]);

    // Spreadsheet preview
    useEffect(() => {
        if (!docViewer) { setSpreadsheetData(null); return; }
        const ext = (docViewer.fileName || '').toLowerCase();
        const isSheet = ext.endsWith('.xls') || ext.endsWith('.xlsx') || ext.endsWith('.csv');
        if (!isSheet) { setSpreadsheetData(null); return; }
        let cancelled = false;
        (async () => {
            try {
                const r = await fetch(`/api/invoices/${docViewer.invoiceId}/preview`, { cache: 'no-store' });
                const d = await r.json();
                if (!cancelled && Array.isArray(d?.data)) setSpreadsheetData(d.data);
            } catch { }
        })();
        return () => { cancelled = true; };
    }, [docViewer]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/invoices?t=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAllInvoices(Array.isArray(data) ? data : (data.invoices || []));
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const myInvoices = useMemo(() => {
        if (!user) return [];
        return allInvoices.filter(inv =>
            (inv.assignedPM === user.id || inv.assignedPM === user.email) &&
            (inv.status === INVOICE_STATUS.PENDING_PM_APPROVAL ||
                inv.status === INVOICE_STATUS.MORE_INFO_NEEDED ||
                inv.pmApproval?.status === 'PENDING' ||
                inv.pmApproval?.status === 'APPROVED' ||
                inv.pmApproval?.status === 'REJECTED' ||
                inv.pmApproval?.status === 'INFO_REQUESTED')
        );
    }, [allInvoices, user]);

    const openReview = async (inv) => {
        setDrawerOpen(true);
        setReviewInvoice(inv);
        setReviewLoading(true);
        setActionType(null);
        setActionNotes('');
        setPmDocs([{ docType: 'Invoice', description: '', file: null, fileName: inv.originalName || '', uploadedDocId: '', uploadStatus: inv.originalName ? 'done' : '' }]);
        try {
            const r = await fetch(`/api/invoices/${inv.id}`, { cache: 'no-store' });
            const d = await r.json();
            if (r.ok) setReviewInvoice(d);
        } catch { }
        finally { setReviewLoading(false); }
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
        setTimeout(() => { setReviewInvoice(null); setActionType(null); setActionNotes(''); setPmDocs([]); }, 300);
    };

    /* ── PM Doc Table helpers ── */
    const addDocRow = () => setPmDocs(p => [...p, { docType: '', description: '', file: null, fileName: '', uploadedDocId: '', uploadStatus: '' }]);
    const removeDocRow = (i) => setPmDocs(p => p.filter((_, idx) => idx !== i));
    const updateDocRow = (i, field, value) => setPmDocs(p => p.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

    const uploadDocFile = async (rowIdx, file, docType) => {
        if (!file || !reviewInvoice) return;
        setUploadingIdx(rowIdx);
        updateDocRow(rowIdx, 'fileName', file.name);
        updateDocRow(rowIdx, 'uploadStatus', 'uploading');
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', mapDocTypeToApi(docType));
            fd.append('invoiceId', reviewInvoice.id);
            const res = await fetch('/api/pm/documents', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            updateDocRow(rowIdx, 'uploadedDocId', data.document?.id || '');
            updateDocRow(rowIdx, 'uploadStatus', 'done');
        } catch (err) {
            updateDocRow(rowIdx, 'uploadStatus', 'error');
            setError(err.message);
        } finally { setUploadingIdx(null); }
    };

    /* ── PM Actions ── */
    const handleApprove = async () => {
        if (!reviewInvoice) return;
        try {
            setProcessingId(reviewInvoice.id);
            const res = await fetch(`/api/pm/approve/${reviewInvoice.id}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'APPROVE', notes: actionNotes })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccessMsg('Invoice approved! Forwarded to Finance.');
            setTimeout(() => setSuccessMsg(null), 4000);
            closeDrawer(); fetchInvoices();
        } catch (err) { setError(err.message); }
        finally { setProcessingId(null); }
    };

    const handleReject = async () => {
        if (!actionNotes.trim()) { setError('Please provide a rejection reason.'); return; }
        try {
            setProcessingId(reviewInvoice.id);
            const res = await fetch(`/api/pm/approve/${reviewInvoice.id}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REJECT', notes: actionNotes })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccessMsg('Invoice rejected. Vendor has been notified.');
            setTimeout(() => setSuccessMsg(null), 4000);
            closeDrawer(); fetchInvoices();
        } catch (err) { setError(err.message); }
        finally { setProcessingId(null); }
    };

    const handleRecheck = async () => {
        try {
            setProcessingId(reviewInvoice.id);
            const res = await fetch(`/api/pm/approve/${reviewInvoice.id}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REQUEST_INFO', notes: actionNotes || 'Please re-check and re-submit.' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccessMsg('Re-check request sent to vendor!');
            setTimeout(() => setSuccessMsg(null), 4000);
            closeDrawer(); fetchInvoices();
        } catch (err) { setError(err.message); }
        finally { setProcessingId(null); }
    };

    /* ── Tabs ── */
    const pendingCount = myInvoices.filter(i => !i.pmApproval?.status || i.pmApproval?.status === 'PENDING').length;
    const recheckCount = myInvoices.filter(i => i.pmApproval?.status === 'INFO_REQUESTED').length;
    const approvedCount = myInvoices.filter(i => i.pmApproval?.status === 'APPROVED').length;
    const rejectedCount = myInvoices.filter(i => i.pmApproval?.status === 'REJECTED').length;

    const filteredInvoices = useMemo(() => {
        switch (activeTab) {
            case 'pending': return myInvoices.filter(i => !i.pmApproval?.status || i.pmApproval?.status === 'PENDING');
            case 'recheck': return myInvoices.filter(i => i.pmApproval?.status === 'INFO_REQUESTED');
            case 'approved': return myInvoices.filter(i => i.pmApproval?.status === 'APPROVED');
            case 'rejected': return myInvoices.filter(i => i.pmApproval?.status === 'REJECTED');
            case 'status': return myInvoices;
            default: return myInvoices;
        }
    }, [myInvoices, activeTab]);

    const tabs = [
        { key: 'pending', label: 'Pending Review', count: pendingCount, icon: 'Clock', active: 'bg-indigo-50 text-indigo-700 border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
        { key: 'recheck', label: 'Re-check Sent', count: recheckCount, icon: 'RefreshCw', active: 'bg-amber-50 text-amber-700 border-amber-200', badge: 'bg-amber-100 text-amber-700' },
        { key: 'approved', label: 'Approved', count: approvedCount, icon: 'CheckCircle2', active: 'bg-emerald-50 text-emerald-700 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
        { key: 'rejected', label: 'Rejected', count: rejectedCount, icon: 'XCircle', active: 'bg-rose-50 text-rose-700 border-rose-200', badge: 'bg-rose-100 text-rose-700' },
        { key: 'all', label: 'All', count: myInvoices.length, icon: 'LayoutList', active: 'bg-slate-100 text-slate-700 border-slate-200', badge: 'bg-slate-200 text-slate-700' },
        { key: 'status', label: 'Status', count: myInvoices.length, icon: 'Activity', active: 'bg-sky-50 text-sky-700 border-sky-200', badge: 'bg-sky-100 text-sky-700' },
    ];

    const isPending = (inv) => !inv?.pmApproval?.status || inv?.pmApproval?.status === 'PENDING' || inv?.pmApproval?.status === 'INFO_REQUESTED';

    /* ── Action colour map ── */
    const ACTION_COLOR = {
        approve: { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', ring: 'focus:ring-emerald-300', label: 'Confirm Approval', icon: 'CheckCircle2', strip: 'bg-emerald-50 border-emerald-200 text-emerald-700', msg: 'Approving invoice — will forward to Finance' },
        reject: { bg: 'bg-rose-600', hover: 'hover:bg-rose-700', ring: 'focus:ring-rose-300', label: 'Confirm Rejection', icon: 'XCircle', strip: 'bg-rose-50 border-rose-200 text-rose-700', msg: 'Rejecting this invoice — vendor will be notified' },
        recheck: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', ring: 'focus:ring-amber-300', label: 'Send Re-check', icon: 'RefreshCw', strip: 'bg-amber-50 border-amber-200 text-amber-700', msg: 'Requesting additional information from vendor' },
    };

    return (
        <div className="space-y-5 pb-10">
            {/* Alerts */}
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium">
                        <Icon name="AlertCircle" size={18} />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="w-6 h-6 rounded-lg hover:bg-rose-100 flex items-center justify-center"><Icon name="X" size={14} /></button>
                    </motion.div>
                )}
                {successMsg && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium">
                        <Icon name="CheckCircle2" size={18} />
                        <span>{successMsg}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${activeTab === tab.key ? `${tab.active} shadow-sm` : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-transparent'}`}>
                        <Icon name={tab.icon} size={16} />
                        {tab.label}
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? tab.badge : 'bg-slate-100 text-slate-400'}`}>{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* ── Status Table Tab ── */}
            {activeTab === 'status' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/60">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sky-600 bg-sky-50">
                            <Icon name="Activity" size={14} />
                        </div>
                        <h3 className="font-bold text-slate-700 text-sm">All Invoice Statuses</h3>
                        <span className="ml-auto text-[10px] font-bold text-slate-400">{myInvoices.length} invoice{myInvoices.length !== 1 ? 's' : ''}</span>
                    </div>
                    {loading ? (
                        <div className="p-10 text-center">
                            <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto" />
                        </div>
                    ) : myInvoices.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-sm text-slate-400">No invoices assigned to you yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[640px]">
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="py-3 pl-5 text-left font-bold">Invoice</th>
                                        <th className="py-3 text-left font-bold">Vendor</th>
                                        <th className="py-3 text-left font-bold">Amount</th>
                                        <th className="py-3 text-center font-bold">PM Status</th>
                                        <th className="py-3 pr-5 text-center font-bold">Finance Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myInvoices.map((inv, i) => {
                                        const pmSt = inv.pmApproval?.status;
                                        const fuSt = inv.financeApproval?.status ||
                                            (inv.status === INVOICE_STATUS.FINANCE_APPROVED ? 'APPROVED' :
                                                inv.status === INVOICE_STATUS.PENDING_FINANCE_REVIEW ? 'PENDING' : null);

                                        const pmBadge = pmSt === 'APPROVED' ? 'bg-emerald-50 text-emerald-700'
                                            : pmSt === 'REJECTED' ? 'bg-rose-50 text-rose-700'
                                                : pmSt === 'INFO_REQUESTED' ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-slate-100 text-slate-500';
                                        const pmIcon = pmSt === 'APPROVED' ? 'CheckCircle2'
                                            : pmSt === 'REJECTED' ? 'XCircle'
                                                : pmSt === 'INFO_REQUESTED' ? 'RefreshCw' : 'Clock';
                                        const pmLabel = pmSt === 'APPROVED' ? 'Approved'
                                            : pmSt === 'REJECTED' ? 'Rejected'
                                                : pmSt === 'INFO_REQUESTED' ? 'Re-check Sent' : 'Pending';

                                        const fuBadge = fuSt === 'APPROVED' ? 'bg-emerald-50 text-emerald-700'
                                            : fuSt === 'REJECTED' ? 'bg-rose-50 text-rose-700'
                                                : fuSt === 'PENDING' ? 'bg-sky-50 text-sky-700'
                                                    : 'bg-slate-100 text-slate-400';
                                        const fuIcon = fuSt === 'APPROVED' ? 'CheckCircle2' : fuSt === 'REJECTED' ? 'XCircle' : 'Clock';
                                        const fuLabel = fuSt === 'APPROVED' ? 'Approved'
                                            : fuSt === 'REJECTED' ? 'Rejected'
                                                : fuSt === 'PENDING' ? 'Pending'
                                                    : pmSt === 'APPROVED' ? 'Pending' : 'Awaiting PM';

                                        return (
                                            <tr key={inv.id} className={`border-t border-slate-50 hover:bg-slate-50/60 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                                                <td className="py-3 pl-5">
                                                    <p className="font-bold text-slate-800">{inv.invoiceNumber || inv.id?.slice(0, 10)}</p>
                                                    <p className="text-[10px] text-slate-400">{inv.date || '—'}</p>
                                                </td>
                                                <td className="py-3">
                                                    <p className="font-semibold text-slate-700">{inv.vendorName || '—'}</p>
                                                    {inv.vendorCode && <p className="text-[10px] font-mono text-violet-500">{inv.vendorCode}</p>}
                                                </td>
                                                <td className="py-3 font-black text-slate-800">{fmt(inv.amount)}</td>
                                                <td className="py-3 text-center">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${pmBadge}`}>
                                                        <Icon name={pmIcon} size={10} /> {pmLabel}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-5 text-center">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${fuBadge}`}>
                                                        <Icon name={fuIcon} size={10} /> {fuLabel}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Cards */}
            {activeTab !== 'status' && (
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
                            <p className="text-base font-bold text-slate-400">{activeTab === 'pending' ? 'All caught up!' : 'No invoices here'}</p>
                            <p className="text-xs text-slate-300 mt-1">{activeTab === 'pending' ? 'No invoices pending your review.' : `No ${activeTab} invoices found.`}</p>
                        </div>
                    ) : (
                        filteredInvoices.map((inv, idx) => {
                            const sc = getStatus(inv.status);
                            const pending = isPending(inv);
                            const pmSt = inv.pmApproval?.status;
                            return (
                                <motion.div key={inv.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                                    className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
                                    <div className="p-4 sm:p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100/50 flex items-center justify-center font-bold text-violet-600 text-xs shrink-0">
                                                    {inv.vendorName?.substring(0, 2).toUpperCase() || 'NA'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-bold text-slate-800 text-sm">{inv.invoiceNumber || inv.id?.slice(0, 10)}</p>
                                                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${sc.bg} ${sc.text}`}>
                                                            <span className={`w-1 h-1 rounded-full ${sc.dot}`} />{sc.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                                                        <span className="font-semibold text-slate-600">{inv.vendorName || 'Unknown Vendor'}</span>
                                                        {inv.vendorCode && <><span>·</span><span className="font-mono text-violet-500 font-semibold">{inv.vendorCode}</span></>}
                                                        {inv.date && <><span>·</span><span>{inv.date}</span></>}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        {inv.billingMonth && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                                <Icon name="Calendar" size={10} /> {inv.billingMonth}
                                                            </span>
                                                        )}
                                                        {inv.project && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                                <Icon name="FolderOpen" size={10} /> {inv.project}
                                                            </span>
                                                        )}
                                                        {pmSt === 'INFO_REQUESTED' && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                                                <Icon name="RefreshCw" size={10} /> Re-check sent
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 pl-14 sm:pl-0">
                                                <p className="text-xl font-black text-slate-800">{fmt(inv.amount)}</p>
                                                {inv.basicAmount && <p className="text-[10px] text-slate-400">Basic: {fmt(inv.basicAmount)}</p>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-4 sm:px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                            {inv.originalName && (
                                                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                                    <Icon name="FileText" size={10} /> {inv.originalName}
                                                </span>
                                            )}
                                            {inv.documents?.length > 0 && (
                                                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                                    <Icon name="Paperclip" size={10} /> {inv.documents.length} attached
                                                </span>
                                            )}
                                        </div>
                                        <button onClick={() => openReview(inv)}
                                            className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-700 transition-all shadow-sm shadow-violet-200">
                                            <Icon name="ClipboardList" size={14} />
                                            Review
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════
                REVIEW DRAWER
            ══════════════════════════════════════════════ */}
            <AnimatePresence>
                {drawerOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={closeDrawer}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />

                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                            className="fixed top-0 right-0 h-full w-full max-w-2xl bg-slate-50 shadow-2xl z-50 flex flex-col overflow-hidden">

                            {/* Header */}
                            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PM Review</p>
                                    <h2 className="font-black text-slate-800 text-lg leading-tight">
                                        {reviewInvoice?.invoiceNumber || reviewInvoice?.id?.slice(0, 12) || '…'}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    {reviewInvoice && (
                                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg ${getStatus(reviewInvoice?.status).bg} ${getStatus(reviewInvoice?.status).text}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${getStatus(reviewInvoice?.status).dot}`} />
                                            {getStatus(reviewInvoice?.status).label}
                                        </span>
                                    )}
                                    <button onClick={closeDrawer}
                                        className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all">
                                        <Icon name="X" size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {reviewLoading ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                                        <div className="w-10 h-10 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                                        <p className="text-sm text-slate-400 font-medium">Loading invoice details…</p>
                                    </div>
                                ) : reviewInvoice ? (
                                    <>
                                        {/* 0. Finance (FU) Status Strip */}
                                        {(() => {
                                            const fuSt = reviewInvoice.financeApproval?.status ||
                                                (reviewInvoice.status === INVOICE_STATUS.FINANCE_APPROVED ? 'APPROVED' :
                                                    reviewInvoice.status === INVOICE_STATUS.PENDING_FINANCE_REVIEW ? 'PENDING' : null);
                                            if (!fuSt) return null;
                                            const cfg = fuSt === 'APPROVED' ? { icon: 'CheckCircle2', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Finance Approved' }
                                                : fuSt === 'REJECTED' ? { icon: 'XCircle', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', label: 'Finance Rejected' }
                                                    : { icon: 'Clock', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200', label: 'Pending Finance Review' };
                                            return (
                                                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                                                    <Icon name={cfg.icon} size={15} className={cfg.color} />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Finance (FU) Status</p>
                                                        <p className={`text-sm font-black ${cfg.color}`}>{cfg.label}</p>
                                                    </div>
                                                    {reviewInvoice.financeApproval?.notes && (
                                                        <p className={`ml-auto text-[10px] font-medium ${cfg.color} opacity-80 max-w-[180px] truncate text-right`} title={reviewInvoice.financeApproval.notes}>
                                                            "{reviewInvoice.financeApproval.notes}"
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* 1. Vendor Details */}

                                        <Section title="Vendor Details" icon="Building2" accent="indigo">
                                            <div className="grid grid-cols-2 gap-4">
                                                <KV label="Vendor Name" value={reviewInvoice.vendorName} />
                                                <KV label="Vendor Code" value={reviewInvoice.vendorCode} mono />
                                                <KV label="Invoice No." value={reviewInvoice.invoiceNumber} mono />
                                                <KV label="Invoice Date" value={reviewInvoice.invoiceDate || reviewInvoice.date} />
                                                <KV label="Billing Month" value={reviewInvoice.billingMonth} />
                                                <KV label="Project" value={reviewInvoice.project} />
                                            </div>
                                        </Section>

                                        {/* 2. Invoice Financials */}
                                        <Section title="Invoice Financials" icon="IndianRupee" accent="emerald">
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Amount</p>
                                                    <p className="text-2xl font-black text-slate-800">{fmt(reviewInvoice.amount)}</p>
                                                </div>
                                                <KV label="Basic Amount (Pre-Tax)" value={fmt(reviewInvoice.basicAmount)} />
                                                <KV label="Tax Type" value={reviewInvoice.taxType?.replace('_', ' + ')} />
                                                <KV label="HSN Code" value={reviewInvoice.hsnCode} mono />
                                                <KV label="Currency" value={reviewInvoice.currency || 'INR'} />
                                                <KV label="PO Number" value={reviewInvoice.poNumber} mono />
                                            </div>


                                        </Section>

                                        {/* 3. Vendor Documents */}
                                        <Section title="Vendor Documents" icon="Paperclip" accent="amber">
                                            <div className="space-y-2">
                                                {reviewInvoice.fileUrl || reviewInvoice.originalName ? (
                                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                                                <Icon name="FileText" size={14} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-slate-700 truncate">{reviewInvoice.originalName || 'Invoice Document'}</p>
                                                                <p className="text-[10px] text-slate-400">Primary Invoice</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                onClick={() => setDocViewer({ invoiceId: reviewInvoice.id, fileName: reviewInvoice.originalName, title: reviewInvoice.originalName || 'Invoice Document' })}
                                                                className="h-7 px-3 rounded-lg bg-white border border-slate-200 text-indigo-600 text-[10px] font-bold hover:bg-indigo-50 transition-all inline-flex items-center gap-1">
                                                                <Icon name="Eye" size={11} /> View
                                                            </button>
                                                            <a href={`/api/invoices/${reviewInvoice.id}/file`} download={reviewInvoice.originalName || 'invoice'}
                                                                className="h-7 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-50 transition-all inline-flex items-center gap-1">
                                                                <Icon name="Download" size={11} /> Download
                                                            </a>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-400 italic">No primary invoice file.</p>
                                                )}

                                                {reviewInvoice.documents?.length > 0 && reviewInvoice.documents.map((doc, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                                                                <Icon name="File" size={14} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-slate-700 truncate">{doc.fileName || doc.documentId || `Document ${i + 1}`}</p>
                                                                <p className="text-[10px] text-slate-400">{doc.type}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setDocViewer({ invoiceId: doc.documentId, fileName: doc.fileName, title: doc.type, useDocApi: true })}
                                                            className="h-7 px-3 rounded-lg bg-white border border-slate-200 text-violet-600 text-[10px] font-bold hover:bg-violet-50 transition-all inline-flex items-center gap-1 shrink-0">
                                                            <Icon name="Eye" size={11} /> View
                                                        </button>
                                                    </div>
                                                ))}

                                                {!reviewInvoice.fileUrl && !reviewInvoice.originalName && (!reviewInvoice.documents || reviewInvoice.documents.length === 0) && (
                                                    <p className="text-xs text-slate-400 italic text-center py-3">No documents attached by vendor.</p>
                                                )}
                                            </div>
                                        </Section>

                                        {/* 4. PM Document Upload Table */}
                                        <Section title="PM Invoice Details & Documents" icon="ClipboardList" accent="violet">
                                            {/* Table */}
                                            <div className="rounded-xl border border-slate-100 overflow-hidden mb-3 overflow-x-auto">
                                                <table className="w-full text-xs min-w-[560px]">
                                                    <thead>
                                                        <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-widest">
                                                            <th className="py-2 pl-3 text-left font-bold w-8">S.No</th>
                                                            <th className="py-2 text-left font-bold">Type of Doc</th>
                                                            <th className="py-2 text-left font-bold">Description</th>
                                                            <th className="py-2 text-left font-bold">Attachment</th>
                                                            {isPending(reviewInvoice) && <th className="py-2 pr-3 w-8"></th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {pmDocs.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={5} className="text-center py-6 text-slate-300 text-xs">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <Icon name="FileText" size={20} className="text-slate-200" />
                                                                        <span>No rows added yet</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ) : pmDocs.map((doc, i) => (
                                                            <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                                                                <td className="py-2 pl-3 text-slate-400 font-mono font-bold">{i + 1}</td>
                                                                <td className="py-2">
                                                                    {isPending(reviewInvoice) ? (
                                                                        <select value={doc.docType} onChange={e => updateDocRow(i, 'docType', e.target.value)}
                                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-200">
                                                                            <option value="">Select…</option>
                                                                            {PM_DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                                        </select>
                                                                    ) : (
                                                                        <span className="inline-flex items-center text-[10px] font-bold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-md">{doc.docType || '—'}</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2">
                                                                    {isPending(reviewInvoice) ? (
                                                                        <input type="text" value={doc.description} onChange={e => updateDocRow(i, 'description', e.target.value)}
                                                                            placeholder="Enter description…"
                                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-200" />
                                                                    ) : (
                                                                        <span className="text-slate-700">{doc.description || '—'}</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2">
                                                                    {isPending(reviewInvoice) ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            {doc.uploadStatus === 'done' && (
                                                                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md truncate max-w-[140px]">
                                                                                    <Icon name="CheckCircle" size={10} /> {doc.fileName?.length > 16 ? doc.fileName.slice(0, 14) + '…' : doc.fileName}
                                                                                </span>
                                                                            )}
                                                                            {doc.uploadStatus === 'uploading' && (
                                                                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                                                                                    <span className="w-3 h-3 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" /> Uploading…
                                                                                </span>
                                                                            )}
                                                                            {doc.uploadStatus === 'error' && (
                                                                                <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded-md">
                                                                                    <Icon name="AlertCircle" size={10} /> Failed
                                                                                </span>
                                                                            )}
                                                                            {doc.uploadStatus !== 'uploading' && (
                                                                                <label className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-2 py-1 rounded-md cursor-pointer transition-all w-fit">
                                                                                    <Icon name="Paperclip" size={10} />
                                                                                    {doc.uploadStatus === 'done' ? 'Replace' : 'Attach'}
                                                                                    <input type="file" className="hidden"
                                                                                        onChange={e => { const f = e.target.files[0]; if (f) uploadDocFile(i, f, doc.docType); e.target.value = ''; }} />
                                                                                </label>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md ${doc.fileName ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
                                                                            {doc.fileName ? <><Icon name="FileText" size={10} /> {doc.fileName}</> : '—'}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                {isPending(reviewInvoice) && (
                                                                    <td className="py-2 pr-3">
                                                                        <button onClick={() => removeDocRow(i)}
                                                                            className="w-6 h-6 rounded-md hover:bg-rose-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all">
                                                                            <Icon name="Trash2" size={12} />
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {isPending(reviewInvoice) && (
                                                <button onClick={addDocRow}
                                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-all">
                                                    <Icon name="Plus" size={13} /> Add Row
                                                </button>
                                            )}
                                        </Section>

                                        {/* 5. Vendor Notes */}
                                        {reviewInvoice.notes && (
                                            <Section title="Vendor Notes" icon="MessageSquare" accent="amber">
                                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewInvoice.notes}</p>
                                            </Section>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-20">No invoice selected.</p>
                                )}
                            </div>

                            {/* Footer Actions */}
                            {reviewInvoice && isPending(reviewInvoice) && (
                                <div className="border-t border-slate-200 bg-white px-6 py-4 shrink-0">
                                    {actionType === null ? (
                                        <div className="flex gap-2">
                                            <button onClick={() => setActionType('reject')}
                                                className="flex-1 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all flex items-center justify-center gap-1.5">
                                                <Icon name="XCircle" size={14} /> Reject
                                            </button>
                                            <button onClick={() => setActionType('recheck')}
                                                className="flex-1 h-10 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 text-xs font-bold hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all flex items-center justify-center gap-1.5">
                                                <Icon name="RefreshCw" size={14} /> Re-check
                                            </button>
                                            <button onClick={() => setActionType('approve')}
                                                className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-200">
                                                <Icon name="CheckCircle2" size={14} /> Approve
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {(() => {
                                                const ac = ACTION_COLOR[actionType];
                                                return (
                                                    <>
                                                        <div className={`flex items-center gap-2 p-3 rounded-xl border ${ac.strip}`}>
                                                            <Icon name={ac.icon} size={15} />
                                                            <p className="text-sm font-bold">{ac.msg}</p>
                                                        </div>
                                                        <textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} rows={2}
                                                            placeholder={actionType === 'approve' ? 'Add approval notes (optional)…' : actionType === 'recheck' ? 'Describe what needs re-checking…' : 'Reason for rejection (required)…'}
                                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none" />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => { setActionType(null); setActionNotes(''); }}
                                                                className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={actionType === 'approve' ? handleApprove : actionType === 'reject' ? handleReject : handleRecheck}
                                                                disabled={!!processingId || (actionType === 'reject' && !actionNotes.trim())}
                                                                className={`flex-1 h-10 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${ac.bg} ${ac.hover}`}>
                                                                {processingId ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Icon name={ac.icon} size={15} />}
                                                                {ac.label}
                                                            </button>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Already decided badge */}
                            {reviewInvoice && !isPending(reviewInvoice) && (
                                <div className="border-t border-slate-200 bg-white px-6 py-4 shrink-0">
                                    <div className={`flex items-center gap-2 p-3 rounded-xl ${reviewInvoice.pmApproval?.status === 'APPROVED' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
                                        <Icon name={reviewInvoice.pmApproval?.status === 'APPROVED' ? 'CheckCircle2' : 'XCircle'} size={16} />
                                        <span className="text-sm font-bold">
                                            {reviewInvoice.pmApproval?.status === 'APPROVED' ? 'You approved this invoice — forwarded to Finance' : 'You rejected this invoice'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* INLINE DOCUMENT VIEWER MODAL */}
            <AnimatePresence>
                {docViewer && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
                        onClick={() => setDocViewer(null)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">{docViewer.title || 'Document'}</h3>
                                    <p className="text-[10px] text-slate-400">{reviewInvoice?.vendorName}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!docViewer.useDocApi && (
                                        <a href={`/api/invoices/${docViewer.invoiceId}/file`} download={docViewer.fileName || 'document'}
                                            className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-violet-50 hover:text-violet-600 transition-all inline-flex items-center gap-1.5">
                                            <Icon name="Download" size={14} /> Download
                                        </a>
                                    )}
                                    <button onClick={() => setDocViewer(null)}
                                        className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all">
                                        <Icon name="X" size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-100 relative min-h-0 overflow-y-auto" style={{ minHeight: '60vh' }}>
                                <DocumentViewer invoiceId={docViewer.invoiceId} fileName={docViewer.fileName} spreadsheetData={spreadsheetData} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
