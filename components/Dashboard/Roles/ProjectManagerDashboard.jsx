"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllInvoices } from "@/lib/api";
import Card from "@/components/ui/Card";
import Icon from "@/components/Icon";
import { formatCurrency } from "@/utils/format";

export default function ProjectManagerDashboard({ user, invoices = [] }) {
    // const [invoices, setInvoices] = useState([]); // REMOVED: Using props
    // const [loading, setLoading] = useState(true); // REMOVED: Managed by parent

    // useEffect(() => { ... }, []); // REMOVED: Data fetching lifted to parent

    // Filter Logic for PM
    const pendingApprovals = invoices.filter(inv => inv.status === 'PENDING_APPROVAL');
    const discrepancies = invoices.filter(inv => inv.status === 'MATCH_DISCREPANCY');

    // In a real app, we would filter by 'user.assignedProjects' here.
    // For now, assuming PM sees all relevant status items or we simulate project filtering.
    // const myProjectInvoices = invoices.filter(inv => user?.assignedProjects?.includes(inv.project));

    const stats = [
        {
            title: "Pending Approval",
            value: pendingApprovals.length,
            icon: "Stamp",
            color: "text-amber-600",
            bg: "bg-amber-50"
        },
        {
            title: "Discrepancies",
            value: discrepancies.length,
            icon: "AlertTriangle",
            color: "text-rose-600",
            bg: "bg-rose-50"
        },
        {
            title: "Verified",
            value: invoices.filter(i => i.status === 'VERIFIED').length,
            icon: "CheckCircle",
            color: "text-emerald-600",
            bg: "bg-emerald-50"
        }
    ];


    return (
        <div className="space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                            <Icon name={stat.icon} size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pending Approvals List */}
                <Card className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                <Icon name="Stamp" size={20} />
                            </div>
                            <h3 className="font-bold text-lg">Pending My Approval</h3>
                        </div>
                        <Link href="/approvals" className="text-sm text-primary hover:underline flex items-center gap-1">
                            View All <Icon name="ArrowRight" size={14} />
                        </Link>
                    </div>

                    {pendingApprovals.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-10">
                            <Icon name="CheckCircle" size={40} className="mb-2 opacity-50" />
                            <p>No pending approvals</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingApprovals.slice(0, 5).map(inv => (
                                <div key={inv.id} className="group flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-500">
                                            {inv.id.slice(-4)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800 text-sm">{inv.vendorName}</p>
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
                <Card className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                                <Icon name="AlertTriangle" size={20} />
                            </div>
                            <h3 className="font-bold text-lg">Discrepancies</h3>
                        </div>
                        <Link href="/matching" className="text-sm text-primary hover:underline flex items-center gap-1">
                            Resolve <Icon name="ArrowRight" size={14} />
                        </Link>
                    </div>

                    {discrepancies.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-10">
                            <Icon name="ShieldCheck" size={40} className="mb-2 opacity-50" />
                            <p>No discrepancies found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {discrepancies.slice(0, 5).map(inv => (
                                <div key={inv.id} className="group flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-rose-200 hover:bg-rose-50/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-500">
                                            {inv.id.slice(-4)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800 text-sm">{inv.vendorName}</p>
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                <p className="text-xs text-rose-600 font-medium">{inv.matching?.discrepancies?.length || 1} Issues</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm text-gray-900">{formatCurrency(inv.amount)}</p>
                                        <Link href={`/digitization/${inv.id}`}>
                                            <button className="text-xs font-medium text-rose-600 hover:text-rose-700 mt-1">Details</button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-6">
                <div className="p-6 bg-linear-to-r from-indigo-500 to-purple-600 rounded-2xl text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                        <h3 className="font-bold text-lg">Manage Project Documents</h3>
                        <p className="text-indigo-100 text-sm mt-1">Upload Ringi, Annex, Timesheets, and Rate Cards</p>
                    </div>
                    <Link
                        href="/pm/documents"
                        className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm shadow hover:bg-indigo-50 transition-colors whitespace-nowrap"
                    >
                        Open Documents
                    </Link>
                </div>
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                        <h3 className="font-bold text-lg text-gray-800">Need to expedite processing?</h3>
                        <p className="text-gray-500 text-sm mt-1">Delegate your approval authority temporarily.</p>
                    </div>
                    <button
                        onClick={() => {
                            const to = prompt("Delegate PM authority to (e.g. Finance User):");
                            if (to) alert(`Delegated to ${to}`);
                        }}
                        className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold text-sm shadow hover:bg-gray-700 transition-colors whitespace-nowrap"
                    >
                        Delegate Authority
                    </button>
                </div>
            </div>
        </div>
    );
}
