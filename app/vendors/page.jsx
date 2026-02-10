"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/Icon";
import { getAllInvoices } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import clsx from "clsx";
import PageHeader from "@/components/Layout/PageHeader";

export default function VendorPortal() {
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

    // Project & PM Selection State — Project optional; PM list = all signed-up project managers
    const [projects, setProjects] = useState([]);
    const [pms, setPms] = useState([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedPM, setSelectedPM] = useState("");
    const [vendorProfile, setVendorProfile] = useState(null); // { vendorCode, name } for display

    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch('/api/vendor/projects');
            if (res.ok) {
                const data = await res.json();
                setProjects(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Failed to fetch projects", error);
        }
    }, []);

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
            fetchProjects();
            fetchAllPms();
            if (user.role === "Vendor") fetchVendorProfile();
        }
    }, [user, fetchProjects, fetchAllPms, fetchVendorProfile]);

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
                return "text-emerald-600 bg-emerald-50 border-emerald-100";
            case "VERIFIED":
            case "APPROVED":
                return "text-blue-600 bg-blue-50 border-blue-100";
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
        <div className="space-y-10 max-w-7xl mx-auto h-full pb-10">
            <PageHeader
                title="Vendor Hub"
                subtitle="Seamlessly manage your billing, track payments in real-time, and resolve discrepancies instantly."
                icon="Package"
                accent="teal"
                roleLabel={vendorProfile?.vendorCode ? `Vendor · ${vendorProfile.vendorCode}` : "Vendor"}
                actions={
                    <div className="flex items-center gap-2">
                        {vendorProfile?.vendorCode && (
                            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200" title="Your vendor ID across the portal">
                                {vendorProfile.vendorCode}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => { setLoading(true); fetchSubmissions(); }}
                            className="w-10 h-10 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center"
                            title="Refresh"
                        >
                            <Icon name="RefreshCw" size={18} className={loading ? "animate-spin" : ""} />
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadCSV}
                            className="w-10 h-10 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center"
                            title="Export CSV"
                        >
                            <Icon name="Download" size={18} />
                        </button>
                    </div>
                }
            />

            {/* Main Content Grid - Single Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)] min-h-[600px]">

                {/* Left Column: Stats & Submission Form */}
                <div className="lg:col-span-1 flex flex-col gap-6 h-full overflow-hidden">
                    {/* Compact Stats */}
                    <div className="grid grid-cols-2 gap-3 shrink-0">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600"><Icon name="FileText" size={14} /></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
                            </div>
                            <p className="text-xl font-black text-slate-800">{stats.total}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><Icon name="CheckCircle" size={14} /></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid</span>
                            </div>
                            <p className="text-xl font-black text-slate-800">{stats.paid}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600"><Icon name="Clock" size={14} /></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</span>
                            </div>
                            <p className="text-xl font-black text-slate-800">{stats.pending}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><Icon name="BarChart3" size={14} /></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Volume</span>
                            </div>
                            <p className="text-lg font-black text-slate-800 truncate" title={`₹${stats.amount.toLocaleString()}`}>
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(stats.amount)}
                            </p>
                        </div>
                    </div>

                    {/* Submission Form - Scrollable if needed */}
                    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="mb-6">
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Icon name="UploadCloud" size={20} className="text-teal-600" />
                                New Submission
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">Upload your invoice details below.</p>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!selectedPM) {
                                alert("Please select a PM to assign this invoice to.");
                                return;
                            }
                            const form = e.target;
                            const formData = new FormData(form);
                            const file = formData.get('file');
                            if (!file || file.size === 0) {
                                alert("Please upload an invoice file.");
                                return;
                            }

                            setLoading(true);
                            try {
                                const metadata = {
                                    ...(selectedProject && { projectId: selectedProject }),
                                    assignedPM: selectedPM,
                                    invoiceNumber: formData.get('invoiceNumber'),
                                    date: formData.get('date'),
                                    amount: formData.get('amount'),
                                    dueDate: formData.get('dueDate')
                                };

                                await import("@/lib/api").then(mod => mod.ingestInvoice(file, metadata));
                                alert("Invoice submitted successfully!");
                                form.reset();
                                setSelectedProject("");
                                setSelectedPM("");
                                handleUploadComplete();
                            } catch (error) {
                                console.error("Submission failed", error);
                                alert("Failed to submit invoice. Please try again.");
                            } finally {
                                setLoading(false);
                            }
                        }} className="space-y-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project & PM</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <select
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                                            value={selectedProject}
                                            onChange={(e) => setSelectedProject(e.target.value)}
                                        >
                                            <option value="">Select Project (Optional)</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <select
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
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
                                    {selectedPM && (
                                        <p className="mt-1.5 text-[10px] text-teal-600 font-medium">
                                            Invoice will be assigned to: {pms.find(p => p.id === selectedPM)?.name || selectedPM}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Invoice No</label>
                                        <input type="text" name="invoiceNumber" className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none" placeholder="INV-001" required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                                        <input type="number" name="amount" step="0.01" className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none" placeholder="0.00" required />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                                        <input type="date" name="date" className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none" required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Due Date</label>
                                        <input type="date" name="dueDate" className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Document</label>
                                    <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" className="file-input file-input-bordered file-input-ghost file-input-sm w-full rounded-xl bg-slate-50/50" required />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full h-11 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-200 hover:bg-teal-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-2"
                                disabled={loading}
                            >
                                {loading ? <span className="loading loading-spinner loading-sm"></span> : <Icon name="Send" size={16} />}
                                Submit Invoice
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Submission History Table */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col overflow-hidden h-full">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Icon name="History" size={20} className="text-teal-600" />
                            Recent Submissions
                        </h2>
                        <span className="text-xs font-medium text-slate-400">
                            Showing {Math.min(allSubmissions.length, 10)} of {allSubmissions.length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                                    <th className="px-6 py-4">Invoice</th>
                                    <th className="px-4 py-4">Date</th>
                                    <th className="px-4 py-4">Amount</th>
                                    <th className="px-4 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading && allSubmissions.length === 0 ? (
                                    [1, 2, 3, 4, 5].map((i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-4">
                                                <div className="h-8 bg-slate-100 rounded-lg w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : allSubmissions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Icon name="Inbox" size={24} className="opacity-50" />
                                            </div>
                                            <p className="text-sm font-medium">No submissions yet</p>
                                        </td>
                                    </tr>
                                ) : (
                                    allSubmissions.slice(0, 20).map((inv, idx) => (
                                        <motion.tr
                                            key={inv.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                        <Icon name="FileText" size={14} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-700 text-xs truncate max-w-[150px]" title={inv.originalName}>
                                                            {inv.originalName || "Invoice"}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{inv.invoiceNumber || inv.id.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 font-medium">
                                                {inv.date || new Date(inv.receivedAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-700">
                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(inv.amount || 0)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border inline-flex items-center gap-1.5",
                                                    getStatusStyle(inv.status)
                                                )}>
                                                    <span className={clsx("w-1 h-1 rounded-full", inv.status === "DIGITIZING" ? "bg-amber-500 animate-pulse" : "bg-current opacity-40")} />
                                                    {inv.status.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <button
                                                    onClick={() => { setViewerInvoiceId(inv.id); setViewerLoading(true); }}
                                                    className="p-1.5 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                                    title="View"
                                                >
                                                    <Icon name="Eye" size={16} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Document viewer modal */}
            <AnimatePresence>
                {viewerInvoiceId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setViewerInvoiceId(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden z-[101] flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 shrink-0">
                                <span className="font-semibold text-gray-800 text-sm truncate">
                                    {allSubmissions.find((i) => i.id === viewerInvoiceId)?.originalName || `Invoice ${viewerInvoiceId}`}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setViewerInvoiceId(null)}
                                    className="btn btn-ghost btn-sm btn-square"
                                >
                                    <Icon name="X" size={20} />
                                </button>
                            </div>
                            <div className="flex-1 min-h-[70vh] bg-gray-100 relative">
                                {viewerLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                                        <span className="loading loading-spinner loading-lg text-primary" />
                                    </div>
                                )}
                                <iframe
                                    src={`/api/invoices/${viewerInvoiceId}/file`}
                                    title="Invoice document"
                                    className="w-full h-full min-h-[70vh] border-0"
                                    onLoad={() => setViewerLoading(false)}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
