'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/Layout/PageHeader';
import Card from '@/components/ui/Card';
import Icon from '@/components/Icon';

export default function PMApprovalsPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading approvals...</div>}>
            <PMApprovalsPageContent />
        </Suspense>
    );
}

function PMApprovalsPageContent() {
    const [invoices, setInvoices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [actionModal, setActionModal] = useState(null);
    const [notes, setNotes] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [viewerInvoiceId, setViewerInvoiceId] = useState(null);
    const [viewerLoading, setViewerLoading] = useState(false);

    const searchParams = useSearchParams();

    useEffect(() => {
        fetchInvoices();
        fetchProjects();
    }, [filterProject]);

    useEffect(() => {
        const invoiceId = searchParams.get('invoiceId');
        if (invoiceId && invoices.length > 0) {
            setViewerInvoiceId(invoiceId);
        }
    }, [searchParams, invoices.length]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            setError(null);
            // Optimization: Fetch only relevant statuses - Standardized to SNAKE_CASE to match backend standard
            const res = await fetch('/api/invoices?status=RECEIVED,DIGITIZING,VALIDATION_REQUIRED,VERIFIED,MATCH_DISCREPANCY,PENDING_APPROVAL');
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to fetch invoices');

            // Backward/forward compatibility: /api/invoices may return an array or { invoices: [] }
            const invoiceList = Array.isArray(data) ? data : (data.invoices || []);

            // Filter for invoices pending PM approval - Standardized to SNAKE_CASE to match backend standard
            let pending = invoiceList.filter(inv =>
                inv.status === 'RECEIVED' ||
                inv.status === 'DIGITIZING' ||
                inv.status === 'VALIDATION_REQUIRED' ||
                inv.status === 'VERIFIED' ||
                inv.status === 'PENDING_APPROVAL' ||
                inv.status === 'MATCH_DISCREPANCY' ||
                (inv.pmApproval?.status === 'PENDING' || !inv.pmApproval?.status)
            );

            if (filterProject) {
                pending = pending.filter(inv => inv.project === filterProject);
            }

            setInvoices(pending);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/pm/projects');
            const data = await res.json();
            if (res.ok) setProjects(data.projects || []);
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    };

    const handleAction = async (invoiceId, action) => {
        try {
            setProcessingId(invoiceId);
            const res = await fetch(`/api/pm/approve/${invoiceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, notes })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setActionModal(null);
            setNotes('');
            fetchInvoices();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="pb-10">
            <PageHeader
                title="Invoice Approvals"
                subtitle="Review and approve project invoices"
                icon="CheckCircle"
                accent="indigo"
            />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Filters */}
                <Card className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <select
                            value={filterProject}
                            onChange={(e) => setFilterProject(e.target.value)}
                            className="w-full sm:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <span className="text-slate-500 text-sm font-medium">
                            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} pending approval
                        </span>
                    </div>
                </Card>

                {/* Error Display */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl mb-6 flex justify-between items-center"
                        >
                            <span>{error}</span>
                            <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded-lg">✕</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Invoice Cards */}
                {loading ? (
                    <div className="text-center py-12">
                        <span className="loading loading-spinner loading-lg text-primary"></span>
                        <p className="mt-4 text-slate-500 font-medium">Loading invoices...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {invoices.map((invoice, idx) => (
                            <motion.div
                                key={invoice.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card className="p-6 h-full flex flex-col border-slate-200/60 hover:shadow-xl hover:shadow-slate-200/40 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800">
                                                {invoice.invoiceNumber || `Invoice ${invoice.id.slice(0, 8)}`}
                                            </h3>
                                            <p className="text-slate-500 font-medium">
                                                {invoice.vendorCode && <span className="font-mono text-indigo-600 mr-1.5 px-1.5 py-0.5 bg-indigo-50 rounded italic">{invoice.vendorCode}</span>}
                                                {invoice.vendorName}
                                            </p>
                                            {(invoice.vendorCode || invoice.vendorId) && (
                                                <p className="text-xs text-slate-400 font-mono mt-1">
                                                    Vendor ID: {invoice.vendorCode || invoice.vendorId}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mb-6">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</p>
                                            <p className="font-bold text-slate-700">{invoice.date || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project</p>
                                            <p className="font-bold text-slate-700 truncate">{invoice.project || 'Unassigned'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">PO Number</p>
                                            <p className="font-bold text-slate-700">{invoice.poNumber || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                                            {invoice.pmApproval?.status ? (
                                                <span
                                                    className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border
                                                    ${invoice.pmApproval.status === 'APPROVED'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                            : invoice.pmApproval.status === 'REJECTED'
                                                                ? 'bg-rose-50 text-rose-700 border-rose-100'
                                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                                        }`}
                                                >
                                                    {invoice.pmApproval.status.replace(/_/g, ' ')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                                                    {invoice.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* View Doc Link */}
                                    <div className="mb-6">
                                        <button
                                            type="button"
                                            onClick={() => { setViewerInvoiceId(invoice.id); setViewerLoading(true); }}
                                            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold text-xs uppercase tracking-wider"
                                        >
                                            <Icon name="FileText" size={14} /> View Document
                                        </button>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-auto flex flex-wrap gap-2 pt-6 border-t border-slate-100">
                                        {invoice.pmApproval?.status === 'APPROVED' || invoice.pmApproval?.status === 'REJECTED' ? (
                                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest
                                                ${invoice.pmApproval?.status === 'APPROVED'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                                                }`}
                                            >
                                                {invoice.pmApproval?.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                                            </span>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setActionModal({ invoice, action: 'APPROVE' })}
                                                    disabled={processingId === invoice.id}
                                                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                                >
                                                    ✓ Approve
                                                </button>
                                                <button
                                                    onClick={() => setActionModal({ invoice, action: 'REJECT' })}
                                                    disabled={processingId === invoice.id}
                                                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 disabled:opacity-50"
                                                >
                                                    ✕ Reject
                                                </button>
                                                <button
                                                    onClick={() => setActionModal({ invoice, action: 'REQUEST_INFO' })}
                                                    disabled={processingId === invoice.id}
                                                    className="w-full sm:flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-slate-500/10 disabled:opacity-50"
                                                >
                                                    ? Request Info
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {!loading && invoices.length === 0 && (
                    <Card className="text-center py-20">
                        <div className="max-w-xs mx-auto">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
                                <Icon name="CheckCircle" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">All caught up!</h3>
                            <p className="text-slate-500 mt-1">No invoices are currently pending your approval.</p>
                        </div>
                    </Card>
                )}

                {/* Action Confirmation Modal */}
                <AnimatePresence>
                    {actionModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-100 p-4">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100"
                            >
                                <h2 className="text-xl font-bold text-white mb-4">
                                    {actionModal.action === 'APPROVE' ? 'Approve' :
                                        actionModal.action === 'REJECT' ? 'Reject' : 'Request Info for'} Invoice?
                                </h2>
                                <p className="text-gray-300 mb-4">
                                    {actionModal.invoice.invoiceNumber || actionModal.invoice.id.slice(0, 8)}
                                    <br />
                                    <span className="text-white font-medium">
                                        ₹{actionModal.invoice.amount?.toLocaleString()} - {actionModal.invoice.vendorCode && <span className="font-mono text-purple-300">{actionModal.invoice.vendorCode}</span>} {actionModal.invoice.vendorCode && '· '}{actionModal.invoice.vendorName}
                                    </span>
                                </p>
                                <div className="mb-6">
                                    <label className="block text-sm text-gray-400 mb-1">
                                        {actionModal.action === 'REJECT' ? 'Rejection Reason' :
                                            actionModal.action === 'REQUEST_INFO' ? 'Information Needed' : 'Notes (Optional)'}
                                        {actionModal.action !== 'APPROVE' && <span className="text-rose-500 ml-1">*</span>}
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                                        placeholder={
                                            actionModal.action === 'REJECT' ? 'Reason for rejection...' :
                                                actionModal.action === 'REQUEST_INFO' ? 'What information do you need?...' :
                                                    'Add any additional notes...'
                                        }
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => { setActionModal(null); setNotes(''); }}
                                        className="order-2 sm:order-1 flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleAction(actionModal.invoice.id, actionModal.action)}
                                        disabled={processingId || (actionModal.action !== 'APPROVE' && !notes)}
                                        className={`order-1 sm:order-2 flex-1 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${actionModal.action === 'APPROVE'
                                            ? 'bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700'
                                            : actionModal.action === 'REJECT'
                                                ? 'bg-rose-600 shadow-rose-500/20 hover:bg-rose-700'
                                                : 'bg-indigo-600 shadow-indigo-500/20 hover:bg-indigo-700'
                                            }`}
                                    >
                                        {processingId ? 'Processing...' : 'Confirm'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Document viewer modal – matches vendor review behavior */}
            <AnimatePresence>
                {viewerInvoiceId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setViewerInvoiceId(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden z-[101] flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 shrink-0">
                                <span className="font-semibold text-gray-800 text-sm truncate">
                                    {invoices.find((i) => i.id === viewerInvoiceId)?.originalName || `Invoice ${viewerInvoiceId}`}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setViewerInvoiceId(null)}
                                    className="btn btn-ghost btn-sm btn-square"
                                >
                                    <Icon name="X" size={20} />
                                </button>
                            </div>
                            <div className="flex-1 min-h-[70vh] bg-gray-100 relative">
                                {viewerLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                                        <span className="loading loading-spinner loading-lg text-primary" />
                                    </div>
                                )}
                                <iframe
                                    src={`/api/invoices/${viewerInvoiceId}/file`}
                                    title="Invoice document"
                                    className="w-full h-full min-h-[70vh] border-0"
                                    onLoad={() => setViewerLoading(false)}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
