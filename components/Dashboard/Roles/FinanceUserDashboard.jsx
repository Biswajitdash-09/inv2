"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Icon from "@/components/Icon";
import DropZone from "@/components/Dashboard/DropZone";

const FinanceUserDashboard = ({ invoices, onUploadComplete }) => {
    const router = useRouter();
    const discrepancyCount = invoices.filter(inv => inv.status === 'MATCH_DISCREPANCY').length;
    const manualReview = invoices.filter(inv => inv.status === 'VALIDATION_REQUIRED').length;
    const readyForPayment = invoices.filter(inv => inv.status === 'APPROVED').length;

    // Sort invoices by date descending for "Recent Activity"
    const recentInvoices = [...invoices]
        .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
        .slice(0, 10);

    return (
        <div className="space-y-8">
            {/* Top Stat Cards - Actionable */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card
                    className="p-5 border-l-4 border-l-error cursor-pointer transform hover:-translate-y-1 transition-all shadow-sm hover:shadow-md"
                    onClick={() => router.push('/matching?status=MATCH_DISCREPANCY')}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Action Needed</p>
                            <p className="text-lg font-bold text-error mt-0.5">Discrepancies</p>
                            <p className="text-3xl font-black text-slate-800 mt-2">{discrepancyCount}</p>
                        </div>
                        <div className="bg-error/10 p-3 rounded-xl">
                            <Icon name="AlertTriangle" className="text-error" size={24} />
                        </div>
                    </div>
                </Card>

                <Card
                    className="p-5 border-l-4 border-l-info cursor-pointer transform hover:-translate-y-1 transition-all shadow-sm hover:shadow-md"
                    onClick={() => router.push('/digitization?status=VALIDATION_REQUIRED')}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Manual Entry</p>
                            <p className="text-lg font-bold text-info mt-0.5">Review Queue</p>
                            <p className="text-3xl font-black text-slate-800 mt-2">{manualReview}</p>
                        </div>
                        <div className="bg-info/10 p-3 rounded-xl">
                            <Icon name="FileText" className="text-info" size={24} />
                        </div>
                    </div>
                </Card>

                <Card
                    className="p-5 border-l-4 border-l-success cursor-pointer transform hover:-translate-y-1 transition-all shadow-sm hover:shadow-md"
                    onClick={() => router.push('/approvals?status=APPROVED')}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Finance Ops</p>
                            <p className="text-lg font-bold text-success mt-0.5">Ready for Payment</p>
                            <p className="text-3xl font-black text-slate-800 mt-2">{readyForPayment}</p>
                        </div>
                        <div className="bg-success/10 p-3 rounded-xl">
                            <Icon name="CheckCircle" className="text-success" size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Recent Activity & Status Tracking */}
                <div className="xl:col-span-2 space-y-8">
                    <Card className="overflow-hidden border-0 shadow-lg">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Recent Invoice Activity</h3>
                            </div>
                            <button onClick={() => router.push('/digitization')} className="text-xs font-bold text-primary hover:underline">
                                View All History
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="font-semibold py-4 pl-6">Invoice / Vendor</th>
                                        <th className="font-semibold py-4">Amount</th>
                                        <th className="font-semibold py-4">Date</th>
                                        <th className="font-semibold py-4">Status</th>
                                        <th className="font-semibold py-4 pr-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {recentInvoices.length > 0 ? (
                                        recentInvoices.map((inv) => (
                                            <tr key={inv.id} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="pl-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 text-xs">
                                                            {inv.vendorName?.substring(0, 2).toUpperCase() || 'NA'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800">{inv.invoiceNumber || "Processing..."}</div>
                                                            <div className="text-xs text-slate-500">{inv.vendorName || "Unknown Vendor"}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="font-semibold text-slate-700">
                                                    {inv.amount ? `₹${Number(inv.amount).toLocaleString()}` : '-'}
                                                </td>
                                                <td className="text-slate-500 text-xs">
                                                    {inv.date || new Date().toLocaleDateString()}
                                                </td>
                                                <td>
                                                    <span className={`badge badge-sm border-0 font-bold py-3 px-3 uppercase text-[10px] tracking-wide
                                                        ${inv.status === 'PAID' || inv.status === 'APPROVED' || inv.status === 'VERIFIED' ? 'bg-success/10 text-success' :
                                                            inv.status === 'REJECTED' ? 'bg-error/10 text-error' :
                                                                inv.status === 'MATCH_DISCREPANCY' ? 'bg-warning/10 text-warning' :
                                                                    inv.status === 'VALIDATION_REQUIRED' ? 'bg-info/10 text-info' :
                                                                        inv.status === 'PENDING_APPROVAL' ? 'bg-warning/10 text-warning' :
                                                                            'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {inv.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="text-right pr-6">
                                                    <button className="btn btn-ghost btn-xs text-slate-400 hover:text-success hover:bg-success/5">
                                                        <Icon name="ArrowRight" size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-10 text-slate-400 italic">
                                                No recent activity found. Upload an invoice to get started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Upload Queue & System Status */}
                <div className="space-y-6">
                    <Card className="h-auto border-0 shadow-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white overflow-hidden relative shadow-indigo-200">
                        {/* Abstract background pattern */}
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>

                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Icon name="UploadCloud" size={20} />
                                Quick Ingestion
                            </h3>
                            <p className="text-indigo-50 text-sm mb-6 font-medium">Drag & drop files here to immediately start the IDP extraction process.</p>
                            <div className="bg-white/10 rounded-2xl p-1 backdrop-blur-sm">
                                <DropZone onUploadComplete={onUploadComplete} theme="dark" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-0 overflow-hidden border-0 shadow-md">
                        <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                            <Icon name="Cpu" size={16} className="text-primary" />
                            <h3 className="font-bold text-sm text-slate-800">System Processing Status</h3>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="font-bold text-slate-600">OCR Engine Accuracy</span>
                                    <span className="text-success font-bold">98.5%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div className="bg-success h-full rounded-full" style={{ width: '98.5%' }}></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="font-bold text-slate-600">Auto-Match Rate</span>
                                    <span className="text-primary font-bold">92.0%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div className="bg-primary h-full rounded-full" style={{ width: '92%' }}></div>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl mt-2">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Live Feed</p>
                                <p className="text-xs text-slate-600 italic leading-snug">
                                    "Processing batch #2944: Detected new vendor format from 'Office Depot'. Adapting extraction template..."
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default FinanceUserDashboard;
