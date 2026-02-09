"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/constants/roles";
import Icon from "@/components/Icon";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/Layout/PageHeader";

export default function AdminDocumentsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (!authLoading && (!user || user.role !== ROLES.ADMIN)) {
            router.push("/dashboard");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const res = await axios.get('/api/admin/documents');
            setDocuments(res.data.documents || []);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDocuments = documents.filter(doc => {
        // Type filter
        if (filter !== "ALL" && doc.type !== filter) return false;
        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return (
                doc.fileName?.toLowerCase().includes(term) ||
                doc.uploadedBy?.name?.toLowerCase().includes(term) ||
                doc.type?.toLowerCase().includes(term)
            );
        }
        return true;
    });

    const documentTypes = ["ALL", "INVOICE", "RINGI", "RFP_COMMERCIAL", "TIMESHEET", "RATE_CARD"];

    const getTypeColor = (type) => {
        const colors = {
            INVOICE: "bg-blue-100 text-blue-700",
            RINGI: "bg-purple-100 text-purple-700",
            RFP_COMMERCIAL: "bg-teal-100 text-teal-700",
            TIMESHEET: "bg-amber-100 text-amber-700",
            RATE_CARD: "bg-rose-100 text-rose-700",
        };
        return colors[type] || "bg-slate-100 text-slate-700";
    };

    const getStatusColor = (status) => {
        if (!status) return "bg-slate-100 text-slate-600";
        const s = status.toUpperCase();
        if (s.includes("APPROVED") || s.includes("VALIDATED") || s.includes("VERIFIED")) {
            return "bg-emerald-100 text-emerald-700";
        }
        if (s.includes("REJECTED") || s.includes("DISCREPANCY")) {
            return "bg-rose-100 text-rose-700";
        }
        if (s.includes("PENDING")) {
            return "bg-amber-100 text-amber-700";
        }
        return "bg-slate-100 text-slate-600";
    };

    const formatDate = (date) => {
        if (!date) return "—";
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (authLoading || !user || user.role !== ROLES.ADMIN) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    return (
        <div className="pb-10">
            <PageHeader
                title="Document Repository"
                subtitle="View all uploaded documents"
                icon="FolderOpen"
                accent="purple"
                roleLabel="Administrator"
            />

            <Card className="p-0 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search documents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none w-64"
                            />
                        </div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                            {documentTypes.map(type => (
                                <option key={type} value={type}>
                                    {type === "ALL" ? "All Types" : type.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchDocuments}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 transition-colors"
                        >
                            <Icon name="RefreshCw" size={14} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/80 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">File Name</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Uploaded By</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center">
                                        <span className="loading loading-spinner loading-md text-primary"></span>
                                    </td>
                                </tr>
                            ) : filteredDocuments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                        <Icon name="FileX" size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>No documents found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredDocuments.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                                                    <Icon name="FileText" size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm text-gray-900 truncate max-w-xs">{doc.fileName}</p>
                                                    <p className="text-xs text-slate-400">{doc.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getTypeColor(doc.type)}`}>
                                                {doc.type?.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">{doc.uploadedBy?.name || "Unknown"}</p>
                                                <p className="text-xs text-slate-400">{doc.uploadedBy?.role || "—"}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(doc.status)}`}>
                                                {doc.status?.replace(/_/g, " ") || "—"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {formatDate(doc.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {doc.fileUrl ? (
                                                <a
                                                    href={doc.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors"
                                                >
                                                    <Icon name="ExternalLink" size={12} />
                                                    View
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-400">No file</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                {filteredDocuments.length > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-sm text-slate-500">
                        Showing {filteredDocuments.length} of {documents.length} documents
                    </div>
                )}
            </Card>
        </div>
    );
}
