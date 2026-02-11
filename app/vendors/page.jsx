"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Icon from "@/components/Icon";
import { getAllInvoices } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import clsx from "clsx";
import PageHeader from "@/components/Layout/PageHeader";

export default function VendorPortal() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading vendor portal...</div>}>
            <VendorPortalContent />
        </Suspense>
    );
}

function VendorPortalContent() {
    const router = useRouter();
    const { user, logout, isLoading: authLoading } = useAuth();
    const logoutRef = useRef(logout);
    logoutRef.current = logout;
    const [allSubmissions, setAllSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchIdRef = useRef(0);

    const fetchSubmissions = useCallback(async () => {
        const thisFetchId = ++fetchIdRef.current;
        try {
            const data = await getAllInvoices();
            // If component unmounted or new fetch started, ignore result
            if (thisFetchId !== fetchIdRef.current) return;
            setAllSubmissions(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to fetch vendor submissions", e);
            if (thisFetchId !== fetchIdRef.current) return;
            if (e?.message === "Unauthorized") logoutRef.current?.();
        } finally {
            if (thisFetchId === fetchIdRef.current) setLoading(false);
        }
    }, []);

    // PM Selection State — PM list = all signed-up project managers
    const [pms, setPms] = useState([]);
    const [selectedPM, setSelectedPM] = useState("");
    const [vendorProfile, setVendorProfile] = useState(null); // { vendorCode, name } for display

    const fetchAllPms = useCallback(async () => {
        try {
            const res = await fetch('/api/pms');
            if (res.ok) {
                const data = await res.json();
                setPms(data.pms || []);
            }
        } catch (error) {
            console.error("Failed to fetch PMs", error);
        }
    }, []);

    const fetchVendorProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/vendor/me');
            if (res.ok) {
                const data = await res.json();
                setVendorProfile(data);
            }
        } catch (error) {
            console.error("Failed to fetch vendor profile", error);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchAllPms();
            if (user.role === "Vendor") fetchVendorProfile();
        }
    }, [user, fetchAllPms, fetchVendorProfile]);

    const searchParams = useSearchParams();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
            return;
        }

        let timeoutId;
        const poll = async () => {
            await fetchSubmissions();
            // Schedule next poll only after current one finishes
            timeoutId = setTimeout(poll, 15000); // 15 seconds
        };

        poll();
        return () => clearTimeout(timeoutId);
    }, [user, authLoading, router, fetchSubmissions]);

    const stats = useMemo(() => {
        const total = allSubmissions.length;
        const paid = allSubmissions.filter((i) => i.status === "PAID").length;
        const pending = allSubmissions.filter((i) => !["PAID", "REJECTED"].includes(i.status)).length;
        const amount = allSubmissions.reduce((sum, i) => sum + (parseFloat(i.amount || i.totalAmount) || 0), 0);
        return { total, paid, pending, amount };
    }, [allSubmissions]);

    const handleUploadComplete = useCallback(() => {
        setLoading(true);
        fetchSubmissions();
        setTimeout(fetchSubmissions, 800);
    }, [fetchSubmissions]);

    const getStatusStyle = (status) => {
        switch (status) {
            case "PAID":
            case "VERIFIED":
            case "APPROVED":
                return "text-emerald-600 bg-emerald-50 border-emerald-100";
            case "MATCH_DISCREPANCY":
                return "text-amber-600 bg-amber-50 border-amber-100";
            case "REJECTED":
                return "text-rose-600 bg-rose-50 border-rose-100";
            case "DIGITIZING":
            case "RECEIVED":
                return "text-amber-600 bg-amber-50 border-amber-100 animate-pulse";
            default:
                return "text-slate-500 bg-slate-50 border-slate-100";
        }
    };

    const [viewerInvoiceId, setViewerInvoiceId] = useState(null);
    const [viewerLoading, setViewerLoading] = useState(true);
    const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [spreadsheetData, setSpreadsheetData] = useState(null);

    const handleViewDocument = async (e, id) => {
        e.stopPropagation();
        setViewerInvoiceId(id);
        setViewerLoading(true);
        setSpreadsheetData(null);

        const inv = allSubmissions.find(i => i.id === id);
        if (inv) {
            const fileName = inv?.originalName?.toLowerCase() || "";
            const isSpreadsheet = fileName.endsWith('.xls') || fileName.endsWith('.xlsx') || fileName.endsWith('.csv');

            if (isSpreadsheet) {
                try {
                    const res = await fetch(`/api/invoices/${id}/preview`);
                    const data = await res.json();
                    if (data.data) {
                        setSpreadsheetData(data.data);
                    }
                } catch (err) {
                    console.error("Failed to fetch spreadsheet preview:", err);
                }
            }
            setViewerLoading(false);
        } else {
            // Fetch if not in memory (though unlikely for submissions)
            try {
                await fetch(`/api/invoices/${id}`);
            } catch (err) {
                console.error("Failed to load invoice data", err);
            } finally {
                setViewerLoading(false);
            }
        }
    };

    // Deep-linking: auto-open invoice viewer from query param
    useEffect(() => {
        const invoiceId = searchParams.get('invoiceId');
        if (invoiceId && allSubmissions.length > 0) {
            // Trigger the view document handler
            handleViewDocument({ stopPropagation: () => { } }, invoiceId);
        }
    }, [searchParams, allSubmissions, handleViewDocument]);

    const handleDownloadCSV = () => {
        if (allSubmissions.length === 0) {
            alert("No submissions to export.");
            return;
        }
        const headers = ["Invoice ID", "Original Name", "Date", "Amount", "Status"];
        const csvContent = [
            headers.join(","),
            ...allSubmissions.map((inv) =>
                [
                    inv.id,
                    `"${inv.originalName || "Invoice"}"`,
                    inv.date || new Date(inv.receivedAt).toLocaleDateString(),
                    inv.amount || inv.totalAmount || 0,
                    inv.status,
                ].join(",")
            ),
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `vendor_export_${new Date().toISOString().split("T")[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="text-center">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="mt-4 text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 max-w-7xl mx-auto h-full pb-10 px-4 sm:px-6 lg:px-0">
            <PageHeader
                title="Dashboard"
                subtitle="Manage billing, track payments, and resolve discrepancies."
                icon="Package"
                accent="teal"
                roleLabel={vendorProfile?.vendorCode ? `Vendor · ${vendorProfile.vendorCode}` : "Vendor"}
                actions={
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                        {user.role === "Vendor" && (
                            <button
                                onClick={() => setIsSubmissionModalOpen(true)}
                                className="flex items-center justify-center gap-2 h-10 sm:h-11 px-4 sm:px-6 bg-teal-600 hover:bg-teal-700 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-lg shadow-teal-500/20 active:scale-95 transition-all whitespace-nowrap order-1 sm:order-none"
                            >
                                <Icon name="Plus" size={16} /> <span className="hidden xs:inline">New Submission</span><span className="xs:hidden">New</span>
                            </button>
                        )}

                        <div className="hidden sm:block h-10 w-px bg-slate-200 mx-1" />

                        <div className="flex items-center gap-2 order-2 sm:order-none">
                            <button
                                type="button"
                                onClick={() => { setLoading(true); fetchSubmissions(); }}
                                className="w-10 h-10 sm:w-11 sm:h-11 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center"
                                title="Refresh"
                            >
                                <Icon name="RefreshCw" size={18} className={loading ? "animate-spin" : ""} />
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadCSV}
                                className="w-10 h-10 sm:w-11 sm:h-11 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center"
                                title="Export CSV"
                            >
                                <Icon name="Download" size={18} />
                            </button>
                        </div>
                    </div>
                }
            />

            {/* Dashboard Stats - Top Row full-width */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Invoices", value: stats.total, icon: "FileText", color: "teal", sub: "Lifetime Submissions" },
                    { label: "Paid & Cleared", value: stats.paid, icon: "CheckCircle", color: "emerald", sub: "Successfully Processed" },
                    { label: "Processing", value: stats.pending, icon: "Clock", color: "amber", sub: "Awaiting Verification" },
                    { label: "Total Volume", value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats.amount), icon: "DollarSign", color: "blue", sub: "Cumulative Billing", isPrice: true }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={clsx(
                                "w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform",
                                stat.color === 'teal' ? 'bg-teal-50 text-teal-600' :
                                    stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                        stat.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                            )}>
                                <Icon name={stat.icon} size={20} />
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-tight">{stat.label}</span>
                        </div>
                        <p className={clsx("font-black text-slate-800 tracking-tight", stat.isPrice ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl")}>{stat.value}</p>
                        <div className={clsx(
                            "mt-3 flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold w-fit px-2.5 py-1 rounded-full",
                            stat.color === 'teal' ? 'bg-teal-50 text-teal-600' :
                                stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                    stat.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                        )}>
                            {stat.sub}
                        </div>
                    </div>
                ))}
            </div>

            <div className="max-w-screen-2xl mx-auto">
                <div className="bg-white rounded-2xl sm:rounded-[3rem] shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
                    <div className="p-6 sm:p-10 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-end justify-between bg-white/50 backdrop-blur-xl gap-4">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3 sm:gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.25rem] bg-slate-50 text-slate-400 flex items-center justify-center shadow-inner">
                                    <Icon name="History" size={22} />
                                </div>
                                Submission History
                            </h2>
                            <p className="text-[10px] sm:text-xs text-slate-400 mt-2 sm:mt-3 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="hidden xs:block w-8 h-px bg-slate-200" />
                                Monitoring {allSubmissions.length} Ledger Records
                            </p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl sm:rounded-2xl border border-slate-200/60">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Transmission Active</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {/* Desktop Table View */}
                        <table className="hidden md:table w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 bg-slate-50/30">
                                    <th className="px-10 py-6">Invoice Reference</th>
                                    <th className="px-6 py-6">Milestone</th>
                                    <th className="px-6 py-6">Financial Value</th>
                                    <th className="px-10 py-6 text-right">Vault Access</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allSubmissions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-10 py-32 text-center">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                                                <Icon name="Inbox" size={48} className="text-slate-200" />
                                            </div>
                                            <p className="text-xl font-black text-slate-300 uppercase tracking-widest">Digital Vault Empty</p>
                                            <p className="text-sm font-medium text-slate-400 mt-3">Ready for your first submission</p>
                                        </td>
                                    </tr>
                                ) : (
                                    allSubmissions.slice(0, 30).map((inv, idx) => (
                                        <motion.tr
                                            key={inv.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="group hover:bg-slate-50/50 transition-all duration-300 cursor-pointer"
                                            onClick={(e) => handleViewDocument(e, inv.id)}
                                        >
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-[1.25rem] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6 transition-all duration-500">
                                                        <Icon name="FileText" size={24} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-slate-800 text-base truncate max-w-[300px]" title={inv.originalName}>
                                                            {inv.originalName || "DOCUMENT_ID_" + inv.id.slice(-6)}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            <span className="text-[10px] text-indigo-600 font-mono font-black bg-indigo-50/50 px-2 py-0.5 rounded-md border border-indigo-100/50">{inv.invoiceNumber || inv.id.slice(0, 8)}</span>
                                                            <span className="text-slate-300 text-[10px] font-black opacity-30">//</span>
                                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{inv.date || new Date(inv.receivedAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className={clsx(
                                                    "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] border-2 shadow-sm inline-flex items-center gap-2.5 transition-all",
                                                    getStatusStyle(inv.status)
                                                )}>
                                                    <div className={clsx("w-2 h-2 rounded-full", inv.status === "DIGITIZING" || inv.status === "RECEIVED" ? "bg-amber-500 animate-pulse" : "bg-current")} />
                                                    {inv.status.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="space-y-1">
                                                    <p className="text-lg font-black text-slate-800 tracking-tight">
                                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(inv.amount || 0)}
                                                    </p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">Gross Valuation</p>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <button
                                                    onClick={(e) => handleViewDocument(e, inv.id)}
                                                    className="w-12 h-12 inline-flex items-center justify-center text-slate-300 group-hover:text-teal-600 bg-white group-hover:bg-teal-50 border border-slate-100 group-hover:border-teal-200 rounded-[1rem] shadow-sm transition-all duration-300 hover:scale-110 active:scale-90"
                                                >
                                                    <Icon name="Eye" size={20} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-slate-50">
                            {allSubmissions.length === 0 ? (
                                <div className="px-8 py-20 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                                        <Icon name="Inbox" size={36} className="text-slate-200" />
                                    </div>
                                    <p className="text-lg font-black text-slate-300 uppercase tracking-widest">Vault Empty</p>
                                </div>
                            ) : (
                                allSubmissions.slice(0, 30).map((inv, idx) => (
                                    <motion.div
                                        key={inv.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-6 active:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={(e) => handleViewDocument(e, inv.id)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                                                    <Icon name="FileText" size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-800 text-sm truncate max-w-[180px]">
                                                        {inv.originalName || "INV_" + inv.id.slice(-6)}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                                        {inv.invoiceNumber || inv.id.slice(0, 8)} • {inv.date || new Date(inv.receivedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center shrink-0">
                                                <Icon name="Eye" size={18} />
                                            </button>
                                        </div>
                                        <div className="mt-5 flex items-center justify-between gap-4">
                                            <span className={clsx(
                                                "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border shadow-sm inline-flex items-center gap-2",
                                                getStatusStyle(inv.status)
                                            )}>
                                                <div className={clsx("w-1.5 h-1.5 rounded-full", inv.status === "DIGITIZING" || inv.status === "RECEIVED" ? "bg-amber-500 animate-pulse" : "bg-current")} />
                                                {inv.status.replace("_", " ")}
                                            </span>
                                            <div className="text-right">
                                                <p className="text-base font-black text-slate-800">
                                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(inv.amount || 0)}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Refined Submission Modal */}
            <AnimatePresence>
                {isSubmissionModalOpen && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            onClick={() => setIsSubmissionModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-4xl rounded-3xl sm:rounded-[3rem] shadow-2xl overflow-hidden z-[151] flex flex-col md:flex-row max-h-[95vh] sm:max-h-[90vh] border border-white mx-auto"
                        >
                            <div className="hidden lg:flex lg:w-[35%] bg-teal-600 p-10 flex-col justify-between text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12">
                                    <Icon name="ShieldCheck" size={200} />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-8 shadow-inner">
                                        <Icon name="UploadCloud" size={28} />
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tight leading-tight">Smart Ingestion Vault</h2>
                                    <p className="text-teal-50/70 text-sm mt-4 font-medium leading-relaxed">
                                        Submit your documents directly to our AI-powered digitization engine.
                                    </p>
                                </div>
                                <div className="space-y-6 relative z-10">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-xs">1</div>
                                        <p className="text-xs font-bold leading-relaxed opacity-90">Instant OCR Digitization</p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-xs">2</div>
                                        <p className="text-xs font-bold leading-relaxed opacity-90">Assigned to PM Verification</p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-xs">3</div>
                                        <p className="text-xs font-bold leading-relaxed opacity-90">Automated POV Matching</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-6 sm:p-12 overflow-y-auto custom-scrollbar bg-slate-50/30">
                                <div className="flex items-center justify-between mb-8 sm:mb-10">
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Invoice Details</h3>
                                        <div className="h-1 w-12 bg-teal-600 mt-2 rounded-full" />
                                    </div>
                                    <button
                                        onClick={() => setIsSubmissionModalOpen(false)}
                                        className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>

                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!selectedPM) { toast.error("Please select a PM."); return; }
                                    const form = e.target;
                                    const formData = new FormData(form);
                                    const file = formData.get('file');
                                    if (!file || file.size === 0) { toast.error("Please upload a file."); return; }

                                    setLoading(true);
                                    const toastId = toast.loading("Uploading invoice...");
                                    try {
                                        const metadata = {
                                            assignedPM: selectedPM,
                                            invoiceNumber: formData.get('invoiceNumber'),
                                            date: formData.get('date'),
                                            amount: formData.get('amount'),
                                            dueDate: formData.get('dueDate')
                                        };
                                        await import("@/lib/api").then(mod => mod.ingestInvoice(file, metadata));
                                        toast.success("Invoice submitted successfully!", { id: toastId });
                                        setIsSubmissionModalOpen(false);
                                        setSelectedFile(null);
                                        handleUploadComplete();
                                    } catch (error) {
                                        toast.error("Failed to submit invoice. Please try again.", { id: toastId });
                                    } finally { setLoading(false); }
                                }} className="space-y-6">
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Assigned PM</label>
                                            <select
                                                className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer"
                                                value={selectedPM}
                                                onChange={(e) => setSelectedPM(e.target.value)}
                                                required
                                            >
                                                <option value="">Select PM</option>
                                                {pms.map(pm => (
                                                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Invoice Number</label>
                                                <input type="text" name="invoiceNumber" className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder:text-slate-300" placeholder="e.g. #7721" required />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Total Amount (₹)</label>
                                                <input type="number" name="amount" step="0.01" className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all font-mono" placeholder="0.00" required />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Submission Date</label>
                                                <input type="date" name="date" className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all" required />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Target Due Date</label>
                                                <input type="date" name="dueDate" className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Upload Attachment</label>
                                            <div className="relative group/modalfile border-2 border-dashed border-slate-200 rounded-2xl hover:border-teal-500 hover:bg-teal-50/30 transition-all p-8 flex flex-col items-center justify-center gap-3">
                                                <input
                                                    type="file"
                                                    name="file"
                                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv"
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    required
                                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                />
                                                <div className={clsx(
                                                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm",
                                                    selectedFile ? "bg-teal-500 text-white" : "bg-slate-50 text-slate-400 group-hover/modalfile:text-teal-600 group-hover/modalfile:bg-white"
                                                )}>
                                                    <Icon name={selectedFile ? "FileCheck" : "FileUp"} size={24} />
                                                </div>
                                                <div className="text-center">
                                                    {selectedFile ? (
                                                        <>
                                                            <p className="text-[11px] font-black text-teal-600 uppercase tracking-widest">{selectedFile.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                                                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Click to change
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Select Invoice File</p>
                                                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">PDF, JPG, PNG, WORD, EXCEL or CSV (Max 10MB)</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsSubmissionModalOpen(false)}
                                            className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-[2] h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:grayscale"
                                            disabled={loading}
                                        >
                                            {loading ? <span className="loading loading-spinner loading-xs"></span> : <Icon name="Check" size={16} />}
                                            Commit & Dispatch
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Document viewer modal (refined for better handling) */}
            <AnimatePresence>
                {viewerInvoiceId && (
                    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            onClick={() => setViewerInvoiceId(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white w-full max-w-5xl rounded-3xl sm:rounded-[3rem] shadow-2xl overflow-hidden z-[161] flex flex-col max-h-[90vh] border border-white"
                        >
                            <div className="flex flex-col sm:flex-row items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-100 bg-slate-50/50 gap-4">
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-200 shrink-0">
                                        <Icon name="FileText" size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-black text-slate-800 text-sm truncate max-w-[200px] sm:max-w-md">
                                            {allSubmissions.find((i) => i.id === viewerInvoiceId)?.originalName || `Invoice ${viewerInvoiceId}`}
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Secure Document Access</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                                    <a
                                        href={`/api/invoices/${viewerInvoiceId}/file`}
                                        download
                                        className="h-9 sm:h-10 px-3 sm:px-4 flex items-center gap-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        <Icon name="Download" size={14} /> <span className="hidden xs:inline">Download</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => setViewerInvoiceId(null)}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors bg-slate-100"
                                    >
                                        <Icon name="X" size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-100 relative min-h-[60vh]">
                                {viewerLoading && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                                        <span className="loading loading-spinner loading-lg text-teal-600 mb-4" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Retreiving Vault Record...</p>
                                    </div>
                                )}
                                {(() => {
                                    const inv = allSubmissions.find(i => i.id === viewerInvoiceId);
                                    if (!inv) return null;

                                    const fileName = inv.originalName?.toLowerCase() || "";
                                    const isSpreadsheet = fileName.endsWith('.xls') || fileName.endsWith('.xlsx') || fileName.endsWith('.csv');
                                    const isDoc = fileName.endsWith('.doc') || fileName.endsWith('.docx');

                                    if (Array.isArray(spreadsheetData) && isSpreadsheet) {
                                        return (
                                            <div className="absolute inset-0 bg-white overflow-auto p-4 sm:p-6">
                                                <div className="min-w-max border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                                    <table className="w-full text-left border-collapse text-[10px] sm:text-[11px]">
                                                        <thead>
                                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                                {spreadsheetData[0]?.map((cell, i) => (
                                                                    <th key={i} className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest border-r border-slate-200 last:border-0">
                                                                        {cell || `Col ${i + 1}`}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {spreadsheetData.slice(1).map((row, i) => (
                                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                                    {row.map((cell, j) => (
                                                                        <td key={j} className="px-4 py-2 text-slate-600 border-r border-slate-100 last:border-0 whitespace-nowrap">
                                                                            {cell}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {spreadsheetData.length >= 100 && (
                                                    <p className="mt-4 text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                                                        Showing first 100 rows
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    }

                                    if (isDoc || (isSpreadsheet && !spreadsheetData)) {
                                        return (
                                            <div className="flex flex-col items-center justify-center h-full p-20 text-center space-y-6">
                                                <div className="w-24 h-24 rounded-[2.5rem] bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                                                    <Icon name="AlertCircle" size={48} />
                                                </div>
                                                <div className="max-w-md">
                                                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Preview Unavailable</h4>
                                                    <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                                                        Office documents (.doc, .xls, .csv) cannot be rendered directly in the browser vault. Please download the file to view its contents.
                                                    </p>
                                                </div>
                                                <a
                                                    href={`/api/invoices/${viewerInvoiceId}/file`}
                                                    download
                                                    className="inline-flex items-center gap-3 h-14 px-8 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-teal-200 transition-all active:scale-95"
                                                >
                                                    <Icon name="Download" size={20} /> Download for Viewing
                                                </a>
                                            </div>
                                        );
                                    }

                                    return (
                                        <iframe
                                            src={`/api/invoices/${viewerInvoiceId}/file`}
                                            title="Invoice document"
                                            className="w-full h-full min-h-[60vh] border-0"
                                            onLoad={() => setViewerLoading(false)}
                                        />
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
