"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllInvoices } from "@/lib/api";
import Card from "@/components/ui/Card";
import Icon from "@/components/Icon";
import { formatCurrency } from "@/utils/format";

export default function ProjectManagerDashboard({ user, invoices = [], filteredInvoices = [], onUploadComplete }) {
    // const [invoices, setInvoices] = useState([]); // REMOVED: Using props
    // const [loading, setLoading] = useState(true); // REMOVED: Managed by parent

    // useEffect(() => { ... }, []); // REMOVED: Data fetching lifted to parent

    // Filter Logic for PM - Standardized to SNAKE_CASE to match backend standard
    const pendingApprovals = invoices.filter(inv =>
        inv.status === 'RECEIVED' ||
        inv.status === 'DIGITIZING' ||
        inv.status === 'VALIDATION_REQUIRED' ||
        inv.status === 'VERIFIED' ||
        inv.status === 'PENDING_APPROVAL' ||
        inv.status === 'MATCH_DISCREPANCY' ||
        (inv.pmApproval?.status === 'PENDING' || !inv.pmApproval?.status)
    );
    const discrepancies = invoices.filter(inv => inv.status === 'MATCH_DISCREPANCY' || inv.matching?.discrepancies?.length > 0);
    const approvedInvoices = invoices.filter(inv =>
        inv.pmApproval?.status === 'APPROVED' ||
        inv.status === 'PAID'
    );

    // Approval history for this PM (invoices where this PM was involved in a decision)
    const approvalHistory = invoices
        .filter(inv => inv.pmApproval?.status && (inv.assignedPM === user.id || inv.pmApproval?.approvedBy === user.id))
        .sort((a, b) => new Date(b.pmApproval?.approvedAt || b.updated_at || b.created_at) - new Date(a.pmApproval?.approvedAt || a.updated_at || a.created_at))
        .slice(0, 10);

    const stats = [
        {
            title: "Total Invoices",
            value: invoices.length,
            icon: "FileText",
            color: "text-indigo-600",
            bg: "bg-indigo-50"
        },
        {
            title: "Pending Approval",
            value: pendingApprovals.length,
            icon: "Stamp",
            color: "text-amber-600",
            bg: "bg-amber-50"
        },
        {
            title: "Approved",
            value: approvedInvoices.length,
            icon: "CheckCircle",
            color: "text-emerald-600",
            bg: "bg-emerald-50"
        },
        {
            title: "Discrepancies",
            value: discrepancies.length,
            icon: "AlertTriangle",
            color: "text-rose-600",
            bg: "bg-rose-50"
        }
    ];


    return (
        <div className="space-y-8 pb-10">
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="flex items-center gap-5 border-slate-200/60 hover:shadow-xl hover:shadow-slate-200/40 transition-all p-6 group">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-4 border-white shadow-sm transition-transform group-hover:scale-110 ${stat.bg} ${stat.color}`}>
                            <Icon name={stat.icon} size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.title}</p>
                            <h3 className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</h3>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pending Approvals List */}
                <Card className="flex flex-col h-full border-slate-200/60 p-0 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shadow-sm shadow-amber-100 border border-white">
                                <Icon name="Stamp" size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 tracking-tight">Pending Approval</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Awaiting Action</p>
                            </div>
                        </div>
                        <Link href="/pm/approvals" className="p-2 hover:bg-white rounded-xl transition-colors group">
                            <Icon name="ArrowRight" size={18} className="text-slate-400 group-hover:text-amber-600 transition-colors" />
                        </Link>
                    </div>

                    {pendingApprovals.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-10">
                            <Icon name="CheckCircle" size={40} className="mb-2 opacity-50" />
                            <p>No pending approvals</p>
                        </div>
                    ) : (
                        <div className="space-y-3 p-3">
                            {pendingApprovals.slice(0, 5).map(inv => (
                                <div key={inv.id} className="group flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-500">
                                            {inv.id.slice(-4)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800 text-sm">{inv.vendorName}{inv.vendorCode && <span className="text-indigo-600 font-mono text-xs ml-1.5">({inv.vendorCode})</span>}</p>
                                            <p className="text-xs text-gray-500">{inv.project || 'General Project'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm text-gray-900">{formatCurrency(inv.amount)}</p>
                                        <Link href={`/approvals/${inv.id}`}>
                                            <button className="text-xs font-medium text-amber-600 hover:text-amber-700 mt-1">Review</button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Discrepancies List */}
                <Card className="flex flex-col h-full border-slate-200/60 p-0 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-100 rounded-xl text-rose-600 shadow-sm shadow-rose-100 border border-white">
                                <Icon name="AlertTriangle" size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 tracking-tight">Discrepancies</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Resolution Required</p>
                            </div>
                        </div>
                        <Link href="/matching" className="p-2 hover:bg-white rounded-xl transition-colors group">
                            <Icon name="ArrowRight" size={18} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
                        </Link>
                    </div>

                    {discrepancies.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-10">
                            <Icon name="ShieldCheck" size={40} className="mb-2 opacity-50" />
                            <p>No discrepancies found</p>
                        </div>
                    ) : (
                        <div className="space-y-3 p-3">
                            {discrepancies.slice(0, 5).map(inv => (
                                <div key={inv.id} className="group flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-rose-200 hover:bg-rose-50/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-500">
                                            {inv.id.slice(-4)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800 text-sm">{inv.vendorName}{inv.vendorCode && <span className="text-indigo-600 font-mono text-xs ml-1.5">({inv.vendorCode})</span>}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-sm text-slate-900">{formatCurrency(inv.amount)}</p>
                                        <Link href={`/matching`}>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-100 px-2 py-0.5 rounded-lg">Resolve</span>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Approvals Card */}
                <div className="group relative p-8 bg-linear-to-br from-amber-500 to-orange-600 rounded-3xl text-white shadow-2xl shadow-amber-500/20 overflow-hidden active:scale-[0.98] transition-all">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                        <Icon name="CheckCircle" size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100 mb-2">Invoice Review</p>
                            <h3 className="text-2xl font-black tracking-tight leading-tight">Approve &<br />Review</h3>
                            <p className="text-amber-100 text-sm mt-3 font-medium max-w-xs leading-relaxed">Review pending invoices, approve, reject, or request more information.</p>
                        </div>
                        <Link
                            href="/pm/approvals"
                            className="w-full sm:w-fit px-8 py-4 bg-white text-amber-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-900/10 hover:shadow-amber-900/20 transition-all flex items-center justify-center gap-2 group/btn"
                        >
                            Open Approvals <Icon name="ArrowRight" size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* Project Assets Card */}
                <div className="group relative p-8 bg-linear-to-br from-indigo-600 to-purple-700 rounded-3xl text-white shadow-2xl shadow-indigo-500/20 overflow-hidden active:scale-[0.98] transition-all">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                        <Icon name="Files" size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 mb-2">Project Assets</p>
                            <h3 className="text-2xl font-black tracking-tight leading-tight">Document<br />Management</h3>
                            <p className="text-indigo-100 text-sm mt-3 font-medium max-w-xs leading-relaxed">Access and manage Ringi, Annex, and Timesheets for your projects.</p>
                        </div>
                        <Link
                            href="/pm/documents"
                            className="w-full sm:w-fit px-8 py-4 bg-white text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/10 hover:shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 group/btn"
                        >
                            Open Documents <Icon name="ArrowRight" size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* Messages Card */}
                <div className="group relative p-8 bg-linear-to-br from-emerald-600 to-teal-700 rounded-3xl text-white shadow-2xl shadow-emerald-500/20 overflow-hidden active:scale-[0.98] transition-all">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
                        <Icon name="Mail" size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200 mb-2">Communication</p>
                            <h3 className="text-2xl font-black tracking-tight leading-tight">Vendor<br />Messages</h3>
                            <p className="text-emerald-100 text-sm mt-3 font-medium max-w-xs leading-relaxed">Communicate with vendors regarding invoice issues and requests.</p>
                        </div>
                        <Link
                            href="/pm/messages"
                            className="w-full sm:w-fit px-8 py-4 bg-white text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/10 hover:shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 group/btn"
                        >
                            Open Messages <Icon name="ArrowRight" size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
            {/* All Invoices / Recent Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200/60 p-0 overflow-hidden shadow-xl shadow-slate-200/20">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                        <div>
                            <h3 className="font-black text-slate-800 tracking-tight text-xl">Recent Invoices</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Project Activity Log</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                                {filteredInvoices.length} Items Found
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ID</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor & Project</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date/Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold text-sm">
                                            No invoices matching the current filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInvoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="text-[11px] font-black text-slate-400 group-hover:text-indigo-600 transition-colors">#{inv.id.slice(-6)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-black text-slate-800 text-sm tracking-tight">{inv.vendorName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{inv.project || 'General Project'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-black text-slate-800 text-sm uppercase">{inv.date || '---'}</p>
                                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">{formatCurrency(inv.amount)}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <span className={`
                                                px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest
                                                ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' :
                                                            inv.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-600' :
                                                                inv.status === 'MATCH_DISCREPANCY' ? 'bg-rose-100 text-rose-600' :
                                                                    inv.status === 'VERIFIED' ? 'bg-blue-100 text-blue-600' :
                                                                        'bg-slate-100 text-slate-500'}
                                            `}>
                                                        {inv.status.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/pm/approvals?invoiceId=${inv.id}`}
                                                    className="inline-flex items-center gap-2 h-8 px-4 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                                                >
                                                    View <Icon name="ExternalLink" size={10} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Approval History Section */}
                <Card className="border-slate-200/60 p-0 overflow-hidden shadow-xl shadow-slate-200/20">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                        <div>
                            <h3 className="font-black text-slate-800 tracking-tight text-xl">Approval History</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {approvalHistory.length} Decisions (Approved / Rejected)
                            </p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor ID & Name</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">PM Decision</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Approved By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {approvalHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-10 text-center text-slate-400 text-sm font-bold">
                                            No approvals or rejections yet.
                                        </td>
                                    </tr>
                                ) : (
                                    approvalHistory.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                                                {inv.invoiceNumber || `#${inv.id.slice(-6)}`}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs text-indigo-600">
                                                        {inv.vendorCode || inv.vendorId || '—'}
                                                    </span>
                                                    <span className="text-slate-700 font-semibold text-xs">
                                                        {inv.vendorName || 'Unknown Vendor'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`
                                                    inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest
                                                    ${inv.pmApproval?.status === 'APPROVED'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                        : inv.pmApproval?.status === 'REJECTED'
                                                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                    }
                                                `}>
                                                    {inv.pmApproval?.status?.replace(/_/g, ' ') || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs text-slate-500">
                                                {inv.pmApproval?.approvedByRole === 'Admin'
                                                    ? `Admin · ${inv.pmApprovedByName || ''}`.trim()
                                                    : `Project Manager · ${inv.pmApprovedByName || ''}`.trim()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div >
        </div >
    );
}


