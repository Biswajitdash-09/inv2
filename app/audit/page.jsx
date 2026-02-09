"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import Icon from "@/components/Icon";
import Link from "next/link";

export default function AuditLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAction, setFilterAction] = useState("ALL");

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/api/audit?limit=200");
            setLogs(res.data);
        } catch (error) {
            toast.error("Failed to fetch audit logs");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.invoice_id?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterAction === "ALL" || log.action === filterAction;

        return matchesSearch && matchesFilter;
    });

    const actionColors = {
        UPDATE: "bg-blue-50 text-blue-700 border-blue-100",
        CREATE: "bg-green-50 text-green-700 border-green-100",
        DELETE: "bg-red-50 text-red-700 border-red-100",
        APPROVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
        REJECT: "bg-orange-50 text-orange-700 border-orange-100",
        LOGIN: "bg-purple-50 text-purple-700 border-purple-100"
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                        Audit Logs
                    </h1>
                    <p className="text-gray-500 mt-2">Complete system activity history (7-year retention)</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        <Icon name="RefreshCw" size={16} />
                        Refresh
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl shadow-lg shadow-gray-900/20 hover:bg-gray-800 transition-all">
                        <Icon name="Download" size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by user, action, or invoice..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                    >
                        <option value="ALL">All Actions</option>
                        <option value="UPDATE">Updates</option>
                        <option value="CREATE">Creates</option>
                        <option value="APPROVE">Approvals</option>
                        <option value="REJECT">Rejections</option>
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading audit logs...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-12 text-center">
                        <Icon name="FileText" size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No audit logs found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.map((log, idx) => (
                                    <tr key={log._id || idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {formatDate(log.timestamp)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold">
                                                    {log.username?.charAt(0) || "S"}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{log.username || "System"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${actionColors[log.action] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                                            {log.details}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.invoice_id ? (
                                                <Link
                                                    href={`/digitization/${log.invoice_id}`}
                                                    className="text-primary text-sm font-medium hover:underline"
                                                >
                                                    {log.invoice_id.substring(0, 12)}...
                                                </Link>
                                            ) : (
                                                <span className="text-gray-400 text-sm">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Stats Footer */}
            <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
                <span>Showing {filteredLogs.length} of {logs.length} entries</span>
                <span>Retention Policy: 7 Years (SOX/IFRS Compliance)</span>
            </div>
        </div>
    );
}
