"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/Icon";
import Link from "next/link";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const AdminDashboard = ({ invoices = [], onRefresh }) => {
    const [systemHealth, setSystemHealth] = useState({
        dbStatus: 'Checking...',
        apiLatency: '--',
        storageUsage: '--'
    });

    const [recentLogs, setRecentLogs] = useState([]);
    const [userCount, setUserCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [recentInvoicesOpen, setRecentInvoicesOpen] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [logsRes, usersRes, healthRes] = await Promise.all([
                axios.get('/api/audit?limit=5'),
                axios.get('/api/users'),
                axios.get('/api/health')
            ]);
            setRecentLogs(logsRes.data || []);
            setUserCount(usersRes.data?.length || 0);

            // Update health data from API
            if (healthRes.data) {
                setSystemHealth({
                    dbStatus: healthRes.data.dbStatus || 'Unknown',
                    apiLatency: healthRes.data.apiLatency || '0ms',
                    storageUsage: healthRes.data.storageUsage || '0%'
                });
            }
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
            setSystemHealth({
                dbStatus: 'Error',
                apiLatency: 'N/A',
                storageUsage: 'N/A'
            });
        } finally {
            setLoading(false);
        }
    };

    const quickActions = [
        { name: "User Management", icon: "Users", path: "/users", color: "from-blue-500 to-blue-600", desc: "Manage system users" },
        { name: "Documents", icon: "FolderOpen", path: "/admin/documents", color: "from-pink-500 to-rose-600", desc: "View uploaded files" },
        { name: "Rate Cards", icon: "CreditCard", path: "/admin/ratecards", color: "from-indigo-500 to-purple-600", desc: "Manage vendor rates" },
        { name: "Configuration", icon: "Settings", path: "/config", color: "from-purple-500 to-purple-600", desc: "System settings" },
        { name: "Audit Logs", icon: "FileText", path: "/audit", color: "from-teal-500 to-teal-600", desc: "Activity history" },
        { name: "Analytics", icon: "BarChart3", path: "/analytics", color: "from-orange-500 to-orange-600", desc: "Reports & insights" }
    ];

    const formatTime = (timestamp) => {
        if (!timestamp) return "Just now";
        const date = new Date(timestamp);
        const diff = Math.floor((Date.now() - date.getTime()) / 60000);
        if (diff < 1) return "Just now";
        if (diff < 60) return `${diff} mins ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-8">
            {/* System Health - clean cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Card className="p-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Database</p>
                    <div className="flex items-center gap-3 mt-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                        <p className="text-xl font-bold text-gray-900">{systemHealth.dbStatus}</p>
                    </div>
                </Card>
                <Card className="p-6 rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/40 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{loading ? '…' : userCount}</p>
                </Card>
            </div>

            {/* Recent Invoices - collapsible open/close */}
            <Card className="p-0 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setRecentInvoicesOpen((o) => !o)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRecentInvoicesOpen((o) => !o); } }}
                    className="w-full p-4 flex justify-between items-center bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left border-b border-slate-100 cursor-pointer"
                >
                    <div className="flex items-center gap-3">
                        <motion.span
                            animate={{ rotate: recentInvoicesOpen ? 0 : -90 }}
                            transition={{ duration: 0.2 }}
                            className="text-slate-500"
                        >
                            <Icon name="ChevronDown" size={20} />
                        </motion.span>
                        <h3 className="font-bold text-gray-800">Recent Invoices (Vendor Submissions)</h3>
                        {invoices?.length > 0 && (
                            <span className="text-xs font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                                {invoices.length}
                            </span>
                        )}
                    </div>
                    {typeof onRefresh === "function" && (
                        <button
                            type="button"
                            onClick={async (e) => {
                                e.stopPropagation();
                                setLoading(true);
                                await onRefresh();
                                setLoading(false);
                            }}
                            disabled={loading}
                            className="text-sm text-primary font-medium hover:underline flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-primary/5 shrink-0 disabled:opacity-50"
                        >
                            <Icon name="RefreshCw" size={14} className={loading ? "animate-spin" : ""} /> Refresh
                        </button>
                    )}
                </div>
                <AnimatePresence initial={false}>
                    {recentInvoicesOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                        >
                            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto custom-scrollbar">
                                {!invoices || invoices.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">No invoices yet. Vendor submissions will appear here.</div>
                                ) : (
                                    invoices.slice(0, 10).map((inv) => (
                                        <Link
                                            key={inv.id}
                                            href={
                                                inv.status === 'MATCH_DISCREPANCY' ? `/matching/${inv.id}` :
                                                    inv.status === 'VALIDATION_REQUIRED' ? `/digitization/${inv.id}` :
                                                        `/approvals/${inv.id}`
                                            }
                                            className="block p-4 flex justify-between items-center hover:bg-slate-50/80 transition-colors gap-4"
                                        >
                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                    <Icon name="FileText" size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm text-gray-900 truncate">{inv.originalName || inv.vendorName || inv.id}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {inv.vendorCode && <span className="font-mono font-semibold text-indigo-600">{inv.vendorCode}</span>}
                                                        {inv.vendorCode && ' · '}
                                                        {inv.vendorName} · <span className="font-medium text-slate-600">{inv.status?.replace(/_/g, " ")}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-semibold text-gray-800">{inv.amount != null ? `₹${Number(inv.amount).toLocaleString()}` : "—"}</p>
                                                <p className="text-xs text-slate-400">{inv.receivedAt ? new Date(inv.receivedAt).toLocaleDateString() : "—"}</p>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                            {invoices?.length > 10 && (
                                <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
                                    <Link href="/approvals" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
                                        View all invoices <Icon name="ArrowRight" size={14} />
                                    </Link>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickActions.map((action) => (
                        <Link key={action.path} href={action.path}>
                            <Card className="p-5 rounded-2xl border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group shadow-sm">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform`}>
                                    <Icon name={action.icon} size={24} className="text-white" />
                                </div>
                                <h3 className="font-bold text-gray-900">{action.name}</h3>
                                <p className="text-sm text-slate-500 mt-1">{action.desc}</p>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Two Column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-0 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">System Configuration</h3>
                        <Link href="/config" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                            <Icon name="Settings" size={14} /> Edit
                        </Link>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-slate-600">3-Way Match Tolerance</span>
                            <span className="font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-lg text-xs font-semibold">±5%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-slate-600">OCR Engine</span>
                            <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 text-xs">Azure Form Recognizer</span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-slate-600">Audit Retention</span>
                            <span className="font-mono bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-semibold">7 Years</span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-slate-600">SAP Integration</span>
                            <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Connected
                            </span>
                        </div>
                    </div>
                </Card>

                <Card className="p-0 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Recent System Activity</h3>
                        <Link href="/audit" className="text-sm text-primary font-medium hover:underline">View All</Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
                        ) : recentLogs.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">No recent activity</div>
                        ) : (
                            recentLogs.map((log, idx) => (
                                <div key={log._id || idx} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 text-sm font-semibold">
                                            {log.username?.charAt(0) || "S"}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">{log.username || "System"}</p>
                                            <p className="text-xs text-slate-500">{log.action}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">{formatTime(log.timestamp)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;
