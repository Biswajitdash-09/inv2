'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '@/components/Icon';
import { useAuth } from '@/context/AuthContext';
import DocumentViewer from '@/components/ui/DocumentViewer';
import { INVOICE_STATUS } from '@/lib/invoice-workflow';

const STATUS_STYLES = {
    [INVOICE_STATUS.PENDING_PM_APPROVAL]: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Pending Your Review' },
    [INVOICE_STATUS.PENDING_FINANCE_REVIEW]: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'PM Approved' },
    [INVOICE_STATUS.FINANCE_APPROVED]: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Fully Approved' },
    [INVOICE_STATUS.PM_REJECTED]: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', label: 'PM Rejected' },
    [INVOICE_STATUS.FINANCE_REJECTED]: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Finance Rejected' },
    [INVOICE_STATUS.MORE_INFO_NEEDED]: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'More Info Requested' },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
    Approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
    REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Rejected' },
    Rejected: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Rejected' },
    PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Paid' },
    MATCH_DISCREPANCY: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Discrepancy' },
};
const getStatus = (s) => STATUS_STYLES[s] || { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: s?.replace(/_/g, ' ') || '—' };

export default function PMApprovalQueuePage() {
    const { user } = useAuth();
    const [allInvoices, setAllInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Action states
    const [processingId, setProcessingId] = useState(null);
    const [actionModal, setActionModal] = useState(null); // { invoice, type: 'approve'|'reject' }
    const [notes, setNotes] = useState('');

    // Invoice details table state per invoice
    const [invoiceDocs, setInvoiceDocs] = useState({});

    // Accepted file types per document type
    const getAcceptForDocType = (docType) => {
        switch (docType) {
            case 'Ringi': return '.pdf';
            case 'Annexure': return '.pdf,.doc,.docx,.xls,.xlsx';
            case 'Timesheet': return '.xls,.xlsx,.pdf';
            case 'Rate Card': return '.xls,.xlsx,.pdf';
            case 'Invoice': return '.pdf';
            default: return '.pdf,.doc,.docx,.xls,.xlsx';
        }
    };

    // Map frontend doc type to API type enum
    const mapDocTypeToApi = (docType) => {
        switch (docType) {
            case 'Ringi': return 'RINGI';
            case 'Annexure': return 'ANNEX';
            case 'Timesheet': return 'TIMESHEET';
            case 'Rate Card': return 'RATE_CARD';
            case 'Invoice': return 'INVOICE';
            default: return 'ANNEX';
        }
    };

    const addDocRow = (invoiceId, invoice) => {
        setInvoiceDocs(prev => {
            const existing = prev[invoiceId] || [];
            const mapTax = (t) => {
                if (t === 'CGST_SGST') return 'CGST+SGST';
                if (t === 'IGST') return 'IGST';
                return '';
            };
            const newRow = existing.length === 0 ? {
                invoiceNo: invoice?.invoiceNumber || '',
                invoiceDate: invoice?.invoiceDate || invoice?.date || '',
                basicAmount: invoice?.basicAmount || invoice?.amount || '',
                taxType: mapTax(invoice?.taxType) || '',
                hsnCode: invoice?.hsnCode || '',
                docType: 'Invoice',
                description: invoice?.category || '',
                file: null, fileName: '', uploadedDocId: '', uploadStatus: ''
            } : {
                invoiceNo: '', invoiceDate: '', basicAmount: '', taxType: '', hsnCode: '',
                docType: '', description: '',
                file: null, fileName: '', uploadedDocId: '', uploadStatus: ''
            };
            return { ...prev, [invoiceId]: [...existing, newRow] };
        });
    };

    const updateDocRow = (invoiceId, rowIndex, field, value) => {
        setInvoiceDocs(prev => {
            const rows = [...(prev[invoiceId] || [])];
            rows[rowIndex] = { ...rows[rowIndex], [field]: value };
            return { ...prev, [invoiceId]: rows };
        });
    };

    const removeDocRow = (invoiceId, rowIndex) => {
        setInvoiceDocs(prev => {
            const rows = [...(prev[invoiceId] || [])];
            rows.splice(rowIndex, 1);
            return { ...prev, [invoiceId]: rows };
        });
    };

    // Upload a document file for a specific row
    const uploadDocFile = async (invoiceId, rowIndex, file, docType) => {
        if (!file || !docType) return;
        updateDocRow(invoiceId, rowIndex, 'uploadStatus', 'uploading');
        updateDocRow(invoiceId, rowIndex, 'fileName', file.name);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', mapDocTypeToApi(docType));
            fd.append('invoiceId', invoiceId);
            const res = await fetch('/api/pm/documents', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            updateDocRow(invoiceId, rowIndex, 'uploadedDocId', data.document?.id || '');
            updateDocRow(invoiceId, rowIndex, 'uploadStatus', 'done');
        } catch (err) {
            console.error('Doc upload error:', err);
            updateDocRow(invoiceId, rowIndex, 'uploadStatus', 'error');
        }
    };

    // Document viewer
    const [viewerInvoice, setViewerInvoice] = useState(null);
    const [spreadsheetData, setSpreadsheetData] = useState(null);

    // Filter
    const [activeTab, setActiveTab] = useState('pending');

    useEffect(() => { fetchInvoices(); }, []);

    // Load CSV/XLS/XLSX preview data for viewer
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
                console.error('Failed to fetch spreadsheet preview for PM viewer:', err);
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

    // Filter invoices assigned to this PM (submitted by vendors)
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

    // Auto-populate invoice details for each invoice on load
    useEffect(() => {
        if (myInvoices.length === 0) return;
        const mapTax = (t) => {
            if (t === 'CGST_SGST') return 'CGST+SGST';
            if (t === 'IGST') return 'IGST';
            return '';
        };
        setInvoiceDocs(prev => {
            const next = { ...prev };
            myInvoices.forEach(inv => {
                if (!next[inv.id] || next[inv.id].length === 0) {
                    next[inv.id] = [{
                        invoiceNo: inv.invoiceNumber || '',
                        invoiceDate: inv.invoiceDate || inv.date || '',
                        basicAmount: inv.basicAmount || inv.amount || '',
                        taxType: mapTax(inv.taxType) || '',
                        hsnCode: inv.hsnCode || '',
                        docType: 'Invoice',
                        description: inv.category || '',
                        file: null, fileName: inv.originalName || '', uploadedDocId: '', uploadStatus: inv.originalName ? 'done' : ''
                    }];
                }
            });
            return next;
        });
    }, [myInvoices]);

    // Tab counts
    const pendingCount = myInvoices.filter(inv =>
        !inv.pmApproval?.status || inv.pmApproval?.status === 'PENDING'
    ).length;
    const recheckCount = myInvoices.filter(inv =>
        inv.pmApproval?.status === 'INFO_REQUESTED'
    ).length;
    const approvedCount = myInvoices.filter(inv =>
        inv.pmApproval?.status === 'APPROVED'
    ).length;
    const rejectedCount = myInvoices.filter(inv =>
        inv.pmApproval?.status === 'REJECTED'
    ).length;

    // Filtered by tab
    const filteredInvoices = useMemo(() => {
        switch (activeTab) {
            case 'pending':
                return myInvoices.filter(inv =>
                    !inv.pmApproval?.status || inv.pmApproval?.status === 'PENDING'
                );
            case 'recheck':
                return myInvoices.filter(inv => inv.pmApproval?.status === 'INFO_REQUESTED');
            case 'approved':
                return myInvoices.filter(inv => inv.pmApproval?.status === 'APPROVED');
            case 'rejected':
                return myInvoices.filter(inv => inv.pmApproval?.status === 'REJECTED');
            default:
                return myInvoices;
        }
    }, [myInvoices, activeTab]);

    const handleApprove = async (invoiceId) => {
        try {
            setProcessingId(invoiceId);
            const res = await fetch(`/api/pm/approve/${invoiceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'APPROVE', notes })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setActionModal(null);
            setNotes('');
            setSuccessMsg('Invoice approved successfully!');
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
            const res = await fetch(`/api/pm/approve/${invoiceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REJECT', notes })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setActionModal(null);
            setNotes('');
            setSuccessMsg('Invoice rejected. Vendor has been notified.');
            setTimeout(() => setSuccessMsg(null), 4000);
            fetchInvoices();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleRecheck = async (invoiceId) => {
        try {
            setProcessingId(invoiceId);
            const res = await fetch(`/api/pm/approve/${invoiceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REQUEST_INFO', notes: notes || 'Please re-check the submitted documents and re-submit.' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setActionModal(null);
            setNotes('');
            setSuccessMsg('Re-check request sent to vendor!');
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
        recheck: { active: 'bg-amber-50 text-amber-700 border-amber-200', badge: 'bg-amber-100 text-amber-700' },
        approved: { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
        rejected: { active: 'bg-rose-50 text-rose-700 border-rose-200', badge: 'bg-rose-100 text-rose-700' },
        all: { active: 'bg-slate-100 text-slate-700 border-slate-200', badge: 'bg-slate-200 text-slate-700' },
    };

    const tabs = [
        { key: 'pending', label: 'Pending Review', count: pendingCount, icon: 'Clock' },
        { key: 'recheck', label: 'Re-check Sent', count: recheckCount, icon: 'RefreshCw' },
        { key: 'approved', label: 'Approved', count: approvedCount, icon: 'CheckCircle2' },
        { key: 'rejected', label: 'Rejected', count: rejectedCount, icon: 'XCircle' },
        { key: 'all', label: 'All', count: myInvoices.length, icon: 'LayoutList' },
    ];

    return (
        <div className="space-y-6 pb-10">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">PM Approval Queue</h1>
                <p className="text-sm text-slate-400 mt-1">Review and approve invoices submitted by Vendors</p>
            </div>

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
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? colors.badge : 'bg-slate-100 text-slate-400'
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
                        const isPending = !inv.pmApproval?.status || inv.pmApproval?.status === 'PENDING' || inv.pmApproval?.status === 'INFO_REQUESTED';
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
                                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100/50 flex items-center justify-center font-bold text-violet-600 text-xs shrink-0">
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
                                                            <span className="font-mono text-violet-500 font-semibold">{inv.vendorCode}</span>
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

                                    {/* Info Tags */}
                                    <div className="flex flex-wrap items-center gap-2 mt-3 pl-13 sm:pl-14">
                                        {inv.pmApproval?.status === 'APPROVED' && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                                                <Icon name="CheckCircle2" size={10} /> PM Approved
                                            </span>
                                        )}
                                        {(inv.status === INVOICE_STATUS.PENDING_FINANCE_REVIEW || inv.status === INVOICE_STATUS.FINANCE_APPROVED) && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                                                <Icon name="ShieldCheck" size={10} /> {inv.status}
                                            </span>
                                        )}
                                        {inv.pmApproval?.notes && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg max-w-xs truncate" title={inv.pmApproval.notes}>
                                                <Icon name="MessageSquare" size={10} /> {inv.pmApproval.notes}
                                            </span>
                                        )}
                                        {inv.originalName && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                                <Icon name="FileText" size={10} /> {inv.originalName}
                                            </span>
                                        )}
                                        {inv.poNumber && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                                <Icon name="Hash" size={10} /> PO: {inv.poNumber}
                                            </span>
                                        )}
                                        {inv.project && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                                <Icon name="FolderOpen" size={10} /> {inv.project}
                                            </span>
                                        )}
                                        {inv.pmApproval?.status === 'REJECTED' && inv.pmApproval?.notes && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg max-w-xs truncate">
                                                <Icon name="MessageSquare" size={10} /> {inv.pmApproval.notes}
                                            </span>
                                        )}
                                    </div>

                                    {/* Invoice Details Table */}
                                    <div className="mt-4 pl-13 sm:pl-14 border-t border-slate-100 pt-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice Details</p>
                                            {isPending && (
                                                <button
                                                    onClick={() => addDocRow(inv.id, inv)}
                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all"
                                                >
                                                    <Icon name="Plus" size={12} />
                                                    Add Row
                                                </button>
                                            )}
                                        </div>
                                        <div className="rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
                                            <table className="w-full text-xs min-w-[1050px]">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200">
                                                        <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-10">S.No</th>
                                                        <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-24">Invoice No</th>
                                                        <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-24">Invoice Date</th>
                                                        <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-24">Basic Amt</th>
                                                        <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-28">Taxes</th>
                                                        <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-20">HSN Code</th>
                                                        <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-28">Type of Doc</th>
                                                        <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-36">Attachment</th>
                                                        <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Description</th>
                                                        {isPending && <th className="w-8"></th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(invoiceDocs[inv.id] || []).length === 0 ? (
                                                        <tr>
                                                            <td colSpan={isPending ? 10 : 9} className="text-center py-6 text-slate-300 text-xs">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <Icon name="FileText" size={20} className="text-slate-200" />
                                                                    <span>No invoice details added yet</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        (invoiceDocs[inv.id] || []).map((doc, i) => (
                                                            <tr key={i} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-3 py-2 text-slate-500 font-medium">{i + 1}</td>
                                                                {/* Invoice No */}
                                                                <td className="px-3 py-2">
                                                                    {isPending ? (
                                                                        <input
                                                                            type="text"
                                                                            value={doc.invoiceNo}
                                                                            onChange={(e) => updateDocRow(inv.id, i, 'invoiceNo', e.target.value)}
                                                                            placeholder="INV-001"
                                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-slate-700 font-medium">{doc.invoiceNo || '—'}</span>
                                                                    )}
                                                                </td>
                                                                {/* Invoice Date */}
                                                                <td className="px-3 py-2">
                                                                    {isPending ? (
                                                                        <input
                                                                            type="date"
                                                                            value={doc.invoiceDate}
                                                                            onChange={(e) => updateDocRow(inv.id, i, 'invoiceDate', e.target.value)}
                                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-slate-700">{doc.invoiceDate || '—'}</span>
                                                                    )}
                                                                </td>
                                                                {/* Basic Amount (before taxes) */}
                                                                <td className="px-3 py-2">
                                                                    {isPending ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-slate-400 text-xs">₹</span>
                                                                            <input
                                                                                type="number"
                                                                                value={doc.basicAmount}
                                                                                onChange={(e) => updateDocRow(inv.id, i, 'basicAmount', e.target.value)}
                                                                                placeholder="0.00"
                                                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-700 font-medium">₹{Number(doc.basicAmount || 0).toLocaleString('en-IN')}</span>
                                                                    )}
                                                                </td>
                                                                {/* Taxes Dropdown */}
                                                                <td className="px-3 py-2">
                                                                    {isPending ? (
                                                                        <select
                                                                            value={doc.taxType}
                                                                            onChange={(e) => updateDocRow(inv.id, i, 'taxType', e.target.value)}
                                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                                                                        >
                                                                            <option value="">Select tax...</option>
                                                                            <option value="CGST+SGST">CGST + SGST</option>
                                                                            <option value="IGST">IGST</option>
                                                                        </select>
                                                                    ) : (
                                                                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md ${doc.taxType === 'CGST+SGST' ? 'bg-blue-50 text-blue-600' :
                                                                            doc.taxType === 'IGST' ? 'bg-violet-50 text-violet-600' :
                                                                                'text-slate-400'
                                                                            }`}>{doc.taxType || '—'}</span>
                                                                    )}
                                                                </td>
                                                                {/* HSN Code */}
                                                                <td className="px-3 py-2">
                                                                    {isPending ? (
                                                                        <input
                                                                            type="text"
                                                                            value={doc.hsnCode}
                                                                            onChange={(e) => updateDocRow(inv.id, i, 'hsnCode', e.target.value)}
                                                                            placeholder="e.g. 9983"
                                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-slate-700 font-mono">{doc.hsnCode || '—'}</span>
                                                                    )}
                                                                </td>
                                                                {/* Type of Doc */}
                                                                <td className="px-3 py-2">
                                                                    {isPending ? (
                                                                        <select
                                                                            value={doc.docType}
                                                                            onChange={(e) => updateDocRow(inv.id, i, 'docType', e.target.value)}
                                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                                                                        >
                                                                            <option value="">Select type...</option>
                                                                            <option value="Invoice">Invoice</option>
                                                                            <option value="Ringi">Ringi</option>
                                                                            <option value="Annexure">Annexure</option>
                                                                            <option value="Timesheet">Timesheet</option>
                                                                            <option value="Rate Card">Rate Card</option>
                                                                        </select>
                                                                    ) : (
                                                                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md ${doc.docType === 'Invoice' ? 'bg-indigo-50 text-indigo-600' :
                                                                            doc.docType === 'Ringi' ? 'bg-amber-50 text-amber-600' :
                                                                                doc.docType === 'Annexure' ? 'bg-teal-50 text-teal-600' :
                                                                                    doc.docType === 'Timesheet' ? 'bg-sky-50 text-sky-600' :
                                                                                        doc.docType === 'Rate Card' ? 'bg-purple-50 text-purple-600' :
                                                                                            'text-slate-400'
                                                                            }`}>{doc.docType || '—'}</span>
                                                                    )}
                                                                </td>
                                                                {/* Attachment */}
                                                                <td className="px-3 py-2">
                                                                    {isPending ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            {doc.uploadStatus === 'done' ? (
                                                                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md truncate max-w-[140px]" title={doc.fileName}>
                                                                                    <Icon name="CheckCircle" size={10} /> {doc.fileName?.length > 16 ? doc.fileName.slice(0, 14) + '...' : doc.fileName}
                                                                                </span>
                                                                            ) : doc.uploadStatus === 'uploading' ? (
                                                                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md">
                                                                                    <span className="animate-spin">⏳</span> Uploading...
                                                                                </span>
                                                                            ) : doc.uploadStatus === 'error' ? (
                                                                                <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-medium bg-rose-50 px-2 py-1 rounded-md">
                                                                                    <Icon name="AlertCircle" size={10} /> Failed
                                                                                </span>
                                                                            ) : null}
                                                                            {doc.uploadStatus !== 'uploading' && (
                                                                                <label className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md cursor-pointer transition-all w-fit">
                                                                                    <Icon name="Paperclip" size={10} />
                                                                                    {doc.uploadStatus === 'done' ? 'Replace' : 'Attach'}
                                                                                    <input
                                                                                        type="file"
                                                                                        className="hidden"
                                                                                        accept={getAcceptForDocType(doc.docType)}
                                                                                        onChange={(e) => {
                                                                                            const f = e.target.files[0];
                                                                                            if (f) uploadDocFile(inv.id, i, f, doc.docType);
                                                                                            e.target.value = '';
                                                                                        }}
                                                                                    />
                                                                                </label>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md truncate max-w-[140px] ${doc.fileName ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'
                                                                            }`} title={doc.fileName}>
                                                                            {doc.fileName ? (<><Icon name="FileText" size={10} /> {doc.fileName}</>) : '—'}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                {/* Description */}
                                                                <td className="px-3 py-2">
                                                                    {isPending ? (
                                                                        <input
                                                                            type="text"
                                                                            value={doc.description}
                                                                            onChange={(e) => updateDocRow(inv.id, i, 'description', e.target.value)}
                                                                            placeholder="Enter description..."
                                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-slate-700">{doc.description || '—'}</span>
                                                                    )}
                                                                </td>
                                                                {isPending && (
                                                                    <td className="px-2 py-2">
                                                                        <button
                                                                            onClick={() => removeDocRow(inv.id, i)}
                                                                            className="w-6 h-6 rounded-md hover:bg-rose-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all"
                                                                            title="Remove row"
                                                                        >
                                                                            <Icon name="Trash2" size={12} />
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
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
                                            View Doc
                                        </button>
                                        <a
                                            href={`/api/invoices/${inv.id}/file`}
                                            download={inv.originalName || `invoice-${inv.id}`}
                                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all"
                                        >
                                            <Icon name="Download" size={14} />
                                            Download
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
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => setActionModal({ invoice: inv, type: 'recheck' })}
                                                    disabled={processingId === inv.id}
                                                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-700 text-[11px] font-bold hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all disabled:opacity-50"
                                                >
                                                    <Icon name="RefreshCw" size={14} />
                                                    Re-check
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
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg ${inv.pmApproval?.status === 'APPROVED'
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : inv.pmApproval?.status === 'INFO_REQUESTED'
                                                    ? 'bg-amber-50 text-amber-600'
                                                    : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                <Icon name={inv.pmApproval?.status === 'APPROVED' ? 'CheckCircle2' : inv.pmApproval?.status === 'INFO_REQUESTED' ? 'RefreshCw' : 'XCircle'} size={12} />
                                                {inv.pmApproval?.status === 'APPROVED' ? 'Approved by you' : inv.pmApproval?.status === 'INFO_REQUESTED' ? 'Re-check sent to vendor' : 'Rejected by you'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* ── Approve Modal ── */}
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
                                        <h2 className="font-bold text-slate-800 text-lg">Approve Invoice</h2>
                                        <p className="text-xs text-slate-400">Approved invoice will be forwarded to Finance for final review</p>
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
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Notes for Vendor (optional)</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all resize-none"
                                        placeholder="Add any approval notes..."
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
                                        <><Icon name="CheckCircle2" size={16} /> Approve Invoice</>
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
                                        <p className="text-xs text-slate-400">Vendor will be notified</p>
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

                                {/* Who gets notified */}
                                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                    <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
                                        <Icon name="Bell" size={12} />
                                        Notification will be sent to:
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-md">
                                            <Icon name="Building" size={10} /> Vendor
                                        </span>
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
                                    <p className="text-[10px] text-slate-400 mt-1">This message will be visible to the Vendor.</p>
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
                                        <><Icon name="XCircle" size={16} /> Reject Invoice</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Re-check Modal ── */}
            <AnimatePresence>
                {actionModal?.type === 'recheck' && (
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
                            <div className="p-5 border-b border-slate-100 bg-amber-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                                        <Icon name="RefreshCw" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800 text-lg">Re-check Invoice</h2>
                                        <p className="text-xs text-slate-400">Send back to vendor for document re-verification</p>
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

                                {/* Who gets notified */}
                                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                    <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
                                        <Icon name="Bell" size={12} />
                                        Notification will be sent to:
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-md">
                                            <Icon name="Building" size={10} /> Vendor
                                        </span>
                                    </div>
                                </div>

                                {/* Message to vendor */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                        Message to Vendor <span className="text-slate-300 font-normal normal-case tracking-normal">(optional)</span>
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all resize-none"
                                        placeholder="e.g. Please re-upload the timesheet with correct dates..."
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Vendor will see this message and can re-submit the documents.</p>
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
                                    onClick={() => handleRecheck(actionModal.invoice.id)}
                                    disabled={processingId}
                                    className="flex-1 px-4 py-3 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processingId ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                                    ) : (
                                        <><Icon name="RefreshCw" size={16} /> Send Re-check</>
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
