'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Icon from '@/components/Icon';

export default function FinanceDashboardPage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/invoices?t=${Date.now()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setInvoices(Array.isArray(data) ? data : (data.invoices || []));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const pendingApprovals = invoices.filter(inv =>
        inv.status === 'PENDING' ||
        inv.status === 'VERIFIED' ||
        (inv.pmApproval?.status === 'APPROVED' && inv.financeApproval?.status !== 'APPROVED')
    ).length;

    const totalSpend = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const thisMonthSpend = invoices.filter(inv => {
        const date = new Date(inv.date);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const processedThisWeek = invoices.filter(inv =>
        new Date(inv.created_at) > weekAgo && inv.status !== 'REJECTED'
    ).length;

    // Sort invoices by date descending for recent activity
    const recentInvoices = [...invoices]
        .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
        .slice(0, 10);

    const getStatusColor = (status) => {
        switch (status) {
            case 'APPROVED':
            case 'VERIFIED':
            case 'manually_submitted':
            case 'PAID':
                return 'bg-green-500/20 text-green-300';
            case 'REJECTED':
                return 'bg-red-500/20 text-red-300';
            case 'MATCH_DISCREPANCY':
                return 'bg-yellow-500/20 text-yellow-300';
            case 'VALIDATION_REQUIRED':
                return 'bg-blue-500/20 text-blue-300';
            case 'Pending':
            case 'PENDING':
            case 'RECEIVED':
            default:
                return 'bg-purple-500/20 text-purple-300';
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
                    <h1 className="text-3xl font-bold text-white mb-2">Finance Dashboard</h1>
                    <p className="text-gray-400">Operational processing and invoice oversight</p>
                </motion.div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-6">
                        {error}
                        <button onClick={() => setError(null)} className="float-right">×</button>
                    </div>
                )}

                {/* Metric Cards - Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-white/15 transition-all cursor-pointer"
                        onClick={() => window.location.href = '/finance/approval-queue'}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Pending Approvals</p>
                                <p className="text-4xl font-bold text-white mt-2">{pendingApprovals}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <Icon name="Clock" size={24} className="text-purple-300" />
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm">Invoices awaiting finance review</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-white/15 transition-all cursor-pointer"
                        onClick={() => window.location.href = '/analytics'}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">MTD Spend</p>
                                <p className="text-4xl font-bold text-white mt-2">
                                    ₹{thisMonthSpend.toLocaleString()}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <Icon name="DollarSign" size={24} className="text-green-300" />
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm">Month-to-date total spend</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-white/15 transition-all cursor-pointer"
                        onClick={() => window.location.href = '/digitization'}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Processed (WoW)</p>
                                <p className="text-4xl font-bold text-white mt-2">{processedThisWeek}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Icon name="Activity" size={24} className="text-blue-300" />
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm">Processed this week</p>
                    </motion.div>
                </div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-8"
                >
                    <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link href="/finance/approval-queue" className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-4 hover:scale-105 transition-transform">
                            <div className="flex flex-col items-center text-center">
                                <Icon name="CheckCircle" size={32} className="text-white mb-2" />
                                <span className="text-white font-medium">Approve Queue</span>
                            </div>
                        </Link>
                        <Link href="/finance/manual-entry" className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-4 hover:scale-105 transition-transform">
                            <div className="flex flex-col items-center text-center">
                                <Icon name="Clipboard" size={32} className="text-white mb-2" />
                                <span className="text-white font-medium">Manual Entry</span>
                            </div>
                        </Link>
                        <Link href="/matching" className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-4 hover:scale-105 transition-transform">
                            <div className="flex flex-col items-center text-center">
                                <Icon name="Search" size={32} className="text-white mb-2" />
                                <span className="text-white font-medium">Discrepancies</span>
                            </div>
                        </Link>
                        <Link href="/analytics" className="bg-gradient-to-br from-orange-600 to-red-600 rounded-xl p-4 hover:scale-105 transition-transform">
                            <div className="flex flex-col items-center text-center">
                                <Icon name="BarChart3" size={32} className="text-white mb-2" />
                                <span className="text-white font-medium">Analytics</span>
                            </div>
                        </Link>
                    </div>
                </motion.div>

                {/* Recent Invoice Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
                >
                    <div className="p-6 border-b border-white/10 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-white">Recent Invoice Activity</h2>
                            <p className="text-gray-400 text-sm">Latest invoice submissions and updates</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Invoice / Vendor</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Amount</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">PM Approval</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                            Loading invoices...
                                        </td>
                                    </tr>
                                ) : recentInvoices.length > 0 ? (
                                    recentInvoices.map((invoice, idx) => (
                                        <tr
                                            key={invoice.id}
                                            className="hover:bg-white/5 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center font-bold text-purple-300 text-xs">
                                                        {invoice.vendorName?.substring(0, 2).toUpperCase() || 'NA'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white">
                                                            {invoice.invoiceNumber || invoice.id.slice(0, 8)}
                                                        </div>
                                                        <div className="text-sm text-gray-400">
                                                            {invoice.vendorCode && <span className="font-mono text-purple-300">{invoice.vendorCode}</span>}
                                                            {invoice.vendorCode && ' · '}
                                                            {invoice.vendorName || 'Unknown Vendor'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-white font-medium">
                                                ₹{invoice.amount?.toLocaleString() || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">
                                                {invoice.date || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${invoice.pmApproval?.status === 'APPROVED' ? 'bg-green-500/20 text-green-300' :
                                                    invoice.pmApproval?.status === 'REJECTED' ? 'bg-red-500/20 text-red-300' :
                                                        'bg-gray-500/20 text-gray-300'
                                                    }`}>
                                                    {invoice.pmApproval?.status || 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                            No recent activity found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
