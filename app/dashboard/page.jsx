"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import { getAllInvoices } from "@/lib/api";
import AnalyticsView from "@/components/Dashboard/AnalyticsView";
import RoleSwitcher from "@/components/Dashboard/RoleSwitcher";
import DropZone from "@/components/Dashboard/DropZone";
import StatCard from "@/components/Dashboard/StatCard";
import Card from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import AdminDashboard from "@/components/Dashboard/Roles/AdminDashboard";
import FinanceUserDashboard from "@/components/Dashboard/Roles/FinanceUserDashboard";
import ProjectManagerDashboard from "@/components/Dashboard/Roles/ProjectManagerDashboard";
import VendorPortal from "@/components/Vendor/VendorPortal";
import NotificationLog from "@/components/Workflow/NotificationLog";
import { ROLES } from "@/constants/roles";
import { formatCurrency } from "@/utils/format";
import PageHeader from "@/components/Layout/PageHeader";

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalAmount: 0,
    pendingCount: 0,
    processingCount: 0,
    approvedCount: 0,
    verifiedCount: 0,
    discrepancyCount: 0
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Protect route and send vendors to vendor page
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user?.role === ROLES.VENDOR) {
      router.replace("/vendors");
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      const data = await getAllInvoices();
      setInvoices(data);
      calculateStats(data);
    } catch (e) {
      console.error("Dashboard fetch error", e);
    }
  };

  const calculateStats = (data) => {
    const totalAmount = data.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    const pendingCount = data.filter(inv => inv.status === "PENDING_APPROVAL").length;
    const processingCount = data.filter(inv => ["DIGITIZING", "RECEIVED"].includes(inv.status)).length;
    const verifiedCount = data.filter(inv => inv.status === "VERIFIED").length;
    const discrepancyCount = data.filter(inv => inv.status === "MATCH_DISCREPANCY").length;

    setStats({
      totalAmount,
      pendingCount,
      processingCount,
      verifiedCount,
      discrepancyCount
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredInvoices = invoices.filter(inv => {
    // 0. Status Filter
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;

    if (!user) return false;
    const role = user.role;

    // 1. Full Access Roles
    if ([ROLES.ADMIN, ROLES.FINANCE_USER].includes(role)) {
      return true;
    }

    // 2. Project Managers - Specific Statuses Only
    if (role === ROLES.PROJECT_MANAGER) {
      return ['VERIFIED', 'MATCH_DISCREPANCY', 'PENDING_APPROVAL'].includes(inv.status);
    }

    // 3. Vendors / Others - No Access (Pending Vendor Portal)
    return false;
  });

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["ID", "Vendor", "Invoice #", "Date", "Amount", "Status", "PO Number"];
    const csvContent = [
      headers.join(","),
      ...filteredInvoices.map(inv => [
        inv.id,
        `"${inv.vendorName}"`,
        inv.invoiceNumber || "",
        inv.date || "",
        inv.amount || 0,
        inv.status,
        inv.poNumber || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadComplete = () => {
    fetchData(); // Refresh data after upload
  };



  // Show loading state while checking authentication or redirecting vendors
  if (authLoading || !user || user?.role === ROLES.VENDOR) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]/50 backdrop-blur-sm">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <span className="loading loading-spinner loading-lg text-primary relative z-10 w-12 h-12"></span>
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Initializing Data...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === ROLES.ADMIN;
  const dashboardActions = !isAdmin && user?.role !== ROLES.VENDOR ? (
    <>
      <div className="hidden xl:flex bg-slate-100/60 p-1 rounded-xl border border-slate-200/60 items-center">
        <button
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === "overview" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          onClick={() => setActiveTab("overview")}
        >
          <Icon name="BarChart2" size={13} /> Overview
        </button>
        <button
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === "analytics" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          onClick={() => router.push('/analytics')}
        >
          <Icon name="PieChart" size={13} /> Analytics
        </button>
      </div>
      <div className="h-8 w-px bg-slate-200 hidden xl:block" />
      <div className="flex items-center gap-2">
        <RoleSwitcher />
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-95 transition-all whitespace-nowrap"
        >
          <Icon name="Plus" size={15} /> <span className="hidden lg:inline">New Invoice</span><span className="lg:hidden">New</span>
        </button>
        <button
          onClick={handleExportCSV}
          className="h-10 w-10 flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 hover:text-indigo-600 hover:border-indigo-200 transition-all"
          title="Export CSV"
        >
          <Icon name="Download" size={17} />
        </button>
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="h-10 w-10 flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer">
            <Icon name="Filter" size={16} />
          </label>
          <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow-xl bg-white rounded-2xl w-56 border border-slate-100 mt-2">
            <div className="px-4 py-2 border-b border-slate-50 mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter by Status</p>
            </div>
            <li><a onClick={() => setStatusFilter("ALL")} className="text-xs font-bold text-slate-600 py-2">All Invoices</a></li>
            <li><a onClick={() => setStatusFilter("PENDING_APPROVAL")} className="text-xs font-bold text-amber-600 py-2">Pending Approval</a></li>
            <li><a onClick={() => setStatusFilter("PAID")} className="text-xs font-bold text-emerald-600 py-2">Paid</a></li>
            <li><a onClick={() => setStatusFilter("MATCH_DISCREPANCY")} className="text-xs font-bold text-orange-600 py-2">Discrepancies</a></li>
            <li><a onClick={() => setStatusFilter("REJECTED")} className="text-xs font-bold text-error py-2">Rejected</a></li>
          </ul>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className="pb-10">
      {user?.role === ROLES.ADMIN ? (
        <PageHeader
          title="Admin Control Center"
          subtitle="System administration & governance"
          icon="Shield"
          accent="purple"
          roleLabel="Administrator"
        />
      ) : user?.role !== ROLES.VENDOR ? (
        <PageHeader
          title="Financial Command"
          subtitle="Real-time Control"
          icon="LayoutDashboard"
          accent="indigo"
          actions={dashboardActions}
        />
      ) : null}

      {user?.role === ROLES.VENDOR ? (
        <VendorPortal onUploadClick={() => setIsUploadModalOpen(true)} />
      ) : user?.role === ROLES.ADMIN ? (
        <AdminDashboard invoices={invoices} onRefresh={fetchData} />
      ) : user?.role === ROLES.FINANCE_USER ? (
        <FinanceUserDashboard invoices={filteredInvoices} onUploadComplete={handleUploadComplete} />
      ) : user?.role === ROLES.PROJECT_MANAGER ? (
        <ProjectManagerDashboard user={user} invoices={filteredInvoices} />
      ) : (
        <>
          {activeTab === 'analytics' ? (
            <AnalyticsView invoices={invoices} />
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Volume"
                  value={formatCurrency(stats.totalAmount)}
                  icon="DollarSign"
                  trend="up"
                  trendValue="12%"
                  color="primary"
                />
                <StatCard
                  title="Discrepancies"
                  value={stats.discrepancyCount}
                  icon="AlertCircle"
                  color="orange"
                />
                <StatCard
                  title="Verified"
                  value={stats.verifiedCount}
                  icon="CheckCircle"
                  color="success"
                />
                <StatCard
                  title="Pending Approval"
                  value={stats.pendingCount}
                  icon="Clock"
                  color="warning"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <DropZone onUploadComplete={handleUploadComplete} />
                  <Card p={0} className="overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold">Recent Invoices</h3>
                      <Link href="/matching" className="text-xs text-primary">View Matching Center</Link>
                    </div>
                    <div className="p-4 space-y-4">
                      {filteredInvoices.slice(0, 5).map((inv, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center font-bold text-gray-400">
                            {inv.id.slice(-2)}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{inv.vendorName}</p>
                            <p className="text-xs text-gray-500">{inv.id} • {inv.status}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">₹{parseFloat(inv.amount).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="space-y-6">
                  <NotificationLog />
                  <Card className="p-4">
                    <h3 className="font-bold mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <button className="btn btn-sm btn-ghost w-full justify-start gap-3">
                        <Icon name="FileText" size={16} />
                        <span>Sync SAP POs</span>
                      </button>
                      <button className="btn btn-sm btn-ghost w-full justify-start gap-3">
                        <Icon name="ShieldCheck" size={16} />
                        <span>Verification Report</span>
                      </button>
                      {user?.role === ROLES.PROJECT_MANAGER && (
                        <button
                          onClick={() => {
                            const to = prompt("Delegate PM authority to (e.g. Finance User):");
                            if (to) alert(`Delegated to ${to}`);
                          }}
                          className="btn btn-sm btn-outline btn-primary w-full gap-3 mt-4"
                        >
                          <Icon name="Users" size={16} />
                          <span>Delegate Authority</span>
                        </button>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </>
          )}
        </>
      )}
      {/* Global Upload Modal */}
      <dialog id="upload_modal" className={`modal ${isUploadModalOpen ? 'modal-open' : ''} modal-bottom sm:modal-middle`}>
        <div className="modal-box w-full max-w-2xl bg-white p-0 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col">
          <div className="p-6 border-b bg-gray-50 flex justify-between items-center shrink-0">
            <div>
              <h3 className="font-black text-lg sm:text-xl text-gray-800 uppercase tracking-tight">Submit New Invoices</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1 uppercase font-bold tracking-wider text-primary">Secure ERP Ingestion Portal</p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="btn btn-sm btn-circle btn-ghost"
            >✕</button>
          </div>
          <div className="p-6 sm:p-10 bg-white overflow-y-auto custom-scrollbar">
            <DropZone onUploadComplete={() => {
              fetchData();
              setIsUploadModalOpen(false);
            }} />
          </div>
          <div className="p-4 bg-gray-50 border-t flex justify-end gap-3 px-6 shrink-0">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="btn btn-ghost rounded-full px-4 sm:px-8 text-xs font-bold uppercase"
            >Cancel</button>
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="btn btn-primary rounded-full px-6 sm:px-10 shadow-lg shadow-primary/20 text-xs font-bold uppercase"
            >
              Done
            </button>
          </div>
        </div>
        <div className="modal-backdrop backdrop-blur-sm bg-black/40" onClick={() => setIsUploadModalOpen(false)}>
          <button>close</button>
        </div>
      </dialog>
    </div>
  );
}