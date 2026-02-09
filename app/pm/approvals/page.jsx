'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
            const res = await fetch('/api/invoices');
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-white mb-2">Invoice Approvals</h1>
                    <p className="text-gray-400">Review and approve invoices for your assigned projects</p>
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/10"
                >
                    <div className="flex flex-wrap gap-4 items-center">
                        <select
                            value={filterProject}
                            onChange={(e) => setFilterProject(e.target.value)}
                            className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <span className="text-gray-400 text-sm">
                            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} pending approval
                        </span>
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

                {/* Invoice Cards */}
                {loading ? (
                    <div className="text-center text-gray-400 py-12">Loading invoices...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {invoices.map((invoice, idx) => (
                            <motion.div
                                key={invoice.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {invoice.invoiceNumber || `Invoice ${invoice.id.slice(0, 8)}`}
                                        </h3>
                                        <p className="text-gray-400">{invoice.vendorName}</p>
                                    </div>
                                    <span className="text-2xl font-bold text-white">
                                        ₹{invoice.amount?.toLocaleString() || '-'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                                    <div>
                                        <p className="text-gray-400">Date</p>
                                        <p className="text-white">{invoice.date || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Project</p>
                                        <p className="text-white">{invoice.project || 'Unassigned'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">PO Number</p>
                                        <p className="text-white">{invoice.poNumber || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Status</p>
                                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300">
                                            {invoice.status}
                                        </span>
                                    </div>
                                </div>

                                {/* View Doc Link */}
                                {invoice.fileUrl && (
                                    <div className="mb-4">
                                        <a
                                            href={invoice.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-400 hover:text-purple-300 text-sm"
                                        >
                                            📄 View Invoice Document
                                        </a>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-4 border-t border-white/10">
                                    <button
                                        onClick={() => setActionModal({ invoice, action: 'APPROVE' })}
                                        disabled={processingId === invoice.id}
                                        className="flex-1 px-4 py-2 bg-green-600/20 text-green-300 rounded-lg hover:bg-green-600/30 transition-colors font-medium disabled:opacity-50"
                                    >
                                        ✓ Approve
                                    </button>
                                    <button
                                        onClick={() => setActionModal({ invoice, action: 'REJECT' })}
                                        disabled={processingId === invoice.id}
                                        className="flex-1 px-4 py-2 bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors font-medium disabled:opacity-50"
                                    >
                                        ✕ Reject
                                    </button>
                                    <button
                                        onClick={() => setActionModal({ invoice, action: 'REQUEST_INFO' })}
                                        disabled={processingId === invoice.id}
                                        className="flex-1 px-4 py-2 bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-colors font-medium disabled:opacity-50"
                                    >
                                        ? Request Info
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {!loading && invoices.length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                        No invoices pending approval
                    </div>
                )}

                {/* Action Confirmation Modal */}
                <AnimatePresence>
                    {actionModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                            onClick={() => { setActionModal(null); setNotes(''); }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-800/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-white/20"
                            >
                                <h2 className="text-xl font-bold text-white mb-4">
                                    {actionModal.action === 'APPROVE' ? 'Approve' :
                                        actionModal.action === 'REJECT' ? 'Reject' : 'Request Info for'} Invoice?
                                </h2>
                                <p className="text-gray-300 mb-4">
                                    {actionModal.invoice.invoiceNumber || actionModal.invoice.id.slice(0, 8)}
                                    <br />
                                    <span className="text-white font-medium">
                                        ₹{actionModal.invoice.amount?.toLocaleString()} - {actionModal.invoice.vendorName}
                                    </span>
                                </p>
                                <div className="mb-6">
                                    <label className="block text-sm text-gray-400 mb-1">
                                        {actionModal.action === 'REJECT' ? 'Rejection Reason' :
                                            actionModal.action === 'REQUEST_INFO' ? 'Information Needed' : 'Notes'}
                                        {actionModal.action !== 'APPROVE' && <span className="text-red-400">*</span>}
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder={
                                            actionModal.action === 'REJECT' ? 'Reason for rejection...' :
                                                actionModal.action === 'REQUEST_INFO' ? 'What information do you need?...' :
                                                    'Add approval notes...'
                                        }
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => { setActionModal(null); setNotes(''); }}
                                        className="flex-1 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleAction(actionModal.invoice.id, actionModal.action)}
                                        disabled={processingId || (actionModal.action !== 'APPROVE' && !notes)}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${actionModal.action === 'APPROVE'
                                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                                : actionModal.action === 'REJECT'
                                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                    >
                                        {processingId ? 'Processing...' : 'Confirm'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
