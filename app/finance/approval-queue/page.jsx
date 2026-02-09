'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FinanceApprovalQueuePage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [processingId, setProcessingId] = useState(null);
    const [approvalModal, setApprovalModal] = useState(null);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/invoices');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Filter for invoices pending finance approval
            const pendingApproval = (data.invoices || []).filter(inv =>
                inv.status === 'Pending' ||
                inv.status === 'Verified' ||
                (inv.pmApproval?.status === 'APPROVED' && inv.financeApproval?.status !== 'APPROVED')
            );

            setInvoices(pendingApproval);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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

            setApprovalModal(null);
            setNotes('');
            fetchInvoices();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (invoiceId) => {
        try {
            setProcessingId(invoiceId);
            const res = await fetch(`/api/finance/approve/${invoiceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REJECT', notes })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setApprovalModal(null);
            setNotes('');
            fetchInvoices();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleBatchApprove = async () => {
        if (!selectedIds.length) return;

        for (const id of selectedIds) {
            try {
                await fetch(`/api/finance/approve/${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'APPROVE', notes: 'Batch approval' })
                });
            } catch (err) {
                console.error(`Failed to approve ${id}:`, err);
            }
        }

        setSelectedIds([]);
        fetchInvoices();
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === invoices.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(invoices.map(i => i.id));
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex justify-between items-center"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Finance Approval Queue</h1>
                        <p className="text-gray-400">Final approval for invoice payment release</p>
                    </div>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBatchApprove}
                            className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
                        >
                            ✓ Approve Selected ({selectedIds.length})
                        </button>
                    )}
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

                {/* Invoice Table */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
                >
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">Loading invoices...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-4 py-4 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === invoices.length && invoices.length > 0}
                                            onChange={toggleSelectAll}
                                            className="rounded border-white/30"
                                        />
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Invoice #</th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Vendor</th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Amount</th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-300 uppercase">PM Approval</th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-300 uppercase">HIL Status</th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {invoices.map((invoice, idx) => (
                                    <motion.tr
                                        key={invoice.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="hover:bg-white/5 transition-colors"
                                    >
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(invoice.id)}
                                                onChange={() => toggleSelect(invoice.id)}
                                                className="rounded border-white/30"
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-white font-medium">
                                            {invoice.invoiceNumber || invoice.id.slice(0, 8)}
                                        </td>
                                        <td className="px-4 py-4 text-gray-300">{invoice.vendorName}</td>
                                        <td className="px-4 py-4 text-white font-medium">
                                            ₹{invoice.amount?.toLocaleString() || '-'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${invoice.pmApproval?.status === 'APPROVED' ? 'bg-green-500/20 text-green-300' :
                                                    invoice.pmApproval?.status === 'REJECTED' ? 'bg-red-500/20 text-red-300' :
                                                        'bg-gray-500/20 text-gray-300'
                                                }`}>
                                                {invoice.pmApproval?.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${invoice.hilReview?.status === 'REVIEWED' ? 'bg-green-500/20 text-green-300' :
                                                    invoice.hilReview?.status === 'FLAGGED' ? 'bg-red-500/20 text-red-300' :
                                                        'bg-yellow-500/20 text-yellow-300'
                                                }`}>
                                                {invoice.hilReview?.status || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setApprovalModal({ invoice, action: 'APPROVE' })}
                                                    disabled={processingId === invoice.id}
                                                    className="px-3 py-1 text-sm bg-green-600/20 text-green-300 rounded-lg hover:bg-green-600/30 transition-colors disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => setApprovalModal({ invoice, action: 'REJECT' })}
                                                    disabled={processingId === invoice.id}
                                                    className="px-3 py-1 text-sm bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {!loading && invoices.length === 0 && (
                        <div className="p-12 text-center text-gray-400">No invoices pending approval</div>
                    )}
                </motion.div>

                {/* Approval Confirmation Modal */}
                <AnimatePresence>
                    {approvalModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                            onClick={() => { setApprovalModal(null); setNotes(''); }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-800/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-white/20"
                            >
                                <h2 className="text-xl font-bold text-white mb-4">
                                    {approvalModal.action === 'APPROVE' ? 'Approve' : 'Reject'} Invoice?
                                </h2>
                                <p className="text-gray-300 mb-4">
                                    Invoice #{approvalModal.invoice.invoiceNumber || approvalModal.invoice.id.slice(0, 8)}
                                    <br />
                                    <span className="text-white font-medium">
                                        ₹{approvalModal.invoice.amount?.toLocaleString()} - {approvalModal.invoice.vendorName}
                                    </span>
                                </p>
                                <div className="mb-6">
                                    <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder={approvalModal.action === 'REJECT' ? 'Reason for rejection...' : 'Add notes...'}
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => { setApprovalModal(null); setNotes(''); }}
                                        className="flex-1 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => approvalModal.action === 'APPROVE'
                                            ? handleApprove(approvalModal.invoice.id)
                                            : handleReject(approvalModal.invoice.id)
                                        }
                                        disabled={processingId}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${approvalModal.action === 'APPROVE'
                                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                                : 'bg-red-600 hover:bg-red-700 text-white'
                                            }`}
                                    >
                                        {processingId ? 'Processing...' : `Confirm ${approvalModal.action}`}
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
