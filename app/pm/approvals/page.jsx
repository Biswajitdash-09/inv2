'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/Layout/PageHeader';
import Card from '@/components/ui/Card';
import Icon from '@/components/Icon';

export default function PMApprovalsPage() {
    const [invoices, setInvoices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [actionModal, setActionModal] = useState(null);
    const [notes, setNotes] = useState('');
    const [filterProject, setFilterProject] = useState('');

    useEffect(() => {
        fetchInvoices();
        fetchProjects();
    }, [filterProject]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            // Optimization: Fetch only relevant statuses
            const res = await fetch('/api/invoices?status=PENDING,VERIFIED,PENDING_APPROVAL');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Filter for invoices pending PM approval
            let pending = (data.invoices || []).filter(inv =>
                inv.status === 'Pending' ||
                inv.status === 'Verified' ||
                inv.pmApproval?.status === 'PENDING' ||
                !inv.pmApproval?.status
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
                subtitle="Review and approve invoices for your assigned projects"
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
                                <Card className="h-full hover:shadow-md transition-all border-slate-200/60">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-bold text-slate-800 truncate">
                                                {invoice.invoiceNumber || `Invoice ${invoice.id.slice(0, 8)}`}
                                            </h3>
                                            <p className="text-sm font-medium text-slate-500 truncate">{invoice.vendorName}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-xl font-black text-indigo-600">
                                                ₹{invoice.amount?.toLocaleString() || '-'}
                                            </span>
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
                                            <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                                                {invoice.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* View Doc Link */}
                                    {invoice.fileUrl && (
                                        <div className="mb-6">
                                            <a
                                                href={invoice.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold text-xs uppercase tracking-wider"
                                            >
                                                <Icon name="FileText" size={14} /> View Document
                                            </a>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-100">
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
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Confirm Action</p>
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                            {actionModal.action === 'APPROVE' ? 'Approve' :
                                                actionModal.action === 'REJECT' ? 'Reject' : 'Request Info'}
                                        </h2>
                                    </div>
                                    <button onClick={() => { setActionModal(null); setNotes(''); }} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                        <Icon name="X" size={20} className="text-slate-400" />
                                    </button>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Invoice Details</p>
                                    <p className="font-bold text-slate-800">
                                        {actionModal.invoice.invoiceNumber || actionModal.invoice.id.slice(0, 8)}
                                    </p>
                                    <p className="text-sm font-medium text-slate-500">
                                        ₹{actionModal.invoice.amount?.toLocaleString()} • {actionModal.invoice.vendorName}
                                    </p>
                                </div>

                                <div className="mb-8">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
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
        </div>
    );
}
