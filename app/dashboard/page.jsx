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
  const [searchQuery, setSearchQuery] = useState("");

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
      // Normalize API response: support array or { invoices: [] }
      const invoiceList = Array.isArray(data) ? data : (data?.invoices || []);
      setInvoices(invoiceList);
      calculateStats(invoiceList);
    } catch (e) {
      if (e.message === 'Unauthorized') {
        router.push('/login');
      } else {
        console.error("Dashboard fetch error", e);
      }
    }
  };

  const calculateStats = (data) => {
    // If PM, we only want stats for assigned projects. 
    // The 'data' from getAllInvoices() should already be filtered by the backend for PMs.
    const filteredData = user?.role === ROLES.PROJECT_MANAGER
      ? data.filter(inv => (user.assignedProjects || []).includes(inv.project) || inv.assignedPM === user.id)
      : data;

    const totalAmount = filteredData.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    const pendingCount = filteredData.filter(inv => inv.status === "PENDING_APPROVAL").length;
    const processingCount = filteredData.filter(inv => ["DIGITIZING", "RECEIVED"].includes(inv.status)).length;
    const verifiedCount = filteredData.filter(inv => inv.status === "VERIFIED").length;
    const discrepancyCount = filteredData.filter(inv => inv.status === "MATCH_DISCREPANCY").length;

    setStats({
      totalAmount,
      pendingCount,
      processingCount,
      verifiedCount,
      discrepancyCount
    });
  };

  useEffect(() => {
    if (!authLoading && user && user.role !== ROLES.VENDOR) {
      fetchData();
    }
  }, [user, authLoading]);

  const [statusFilter, setStatusFilter] = useState("ALL");

  // Robust role checks (declared early so downstream logic can use them safely)
  const isAdmin = user?.role === ROLES.ADMIN;
  const isPM = Array.isArray(user?.role)
    ? user.role.includes(ROLES.PROJECT_MANAGER)
    : (user?.role === ROLES.PROJECT_MANAGER || user?.role?.toLowerCase() === 'project manager' || user?.role === 'PM');

  const isFinance = Array.isArray(user?.role)
    ? user.role.includes(ROLES.FINANCE_USER)
    : (user?.role === ROLES.FINANCE_USER || user?.role?.toLowerCase() === 'finance user');

  const isVendor = Array.isArray(user?.role)
    ? user.role.includes(ROLES.VENDOR)
    : (user?.role === ROLES.VENDOR || user?.role?.toLowerCase() === 'vendor');

  const filteredInvoices = invoices.filter(inv => {
    // 0. Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        inv.vendorName?.toLowerCase().includes(query) ||
        inv.invoiceNumber?.toLowerCase().includes(query) ||
        inv.id?.toLowerCase().includes(query) ||
        inv.amount?.toString().includes(query);
      if (!matchesSearch) return false;
    }

    // 1. Status Filter
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;

    if (!user) return false;
    const role = user.role;

    // 2. Full Access Roles
    if ([ROLES.ADMIN, ROLES.FINANCE_USER].includes(role)) {
      return true;
    }

    // 3. Project Managers - specific project access required
    if (isPM) {
      // Log for debugging (safe version)
      // console.log('PM Filtering:', inv.id, inv.project, user.assignedProjects);

      if (invoices.length > 0 && filteredInvoices.length === 0) {
        console.log('PM Access Debug:', {
          userProjects: user.assignedProjects,
          userId: user.id,
          sampleInvProject: invoices[0]?.project,
          sampleInvPM: invoices[0]?.assignedPM
        });
      }

      const hasProjectAccess = (user.assignedProjects || []).includes(inv.project) || inv.assignedPM === user.id;
      return hasProjectAccess;
    }

    // 4. Vendors / Others - No Access (Pending Vendor Portal)
    return false;
  });

  console.log('Dashboard Render Debug:', {
    role: user?.role,
    totalInvoices: invoices.length,
    filteredCount: filteredInvoices.length,
    isPM: isPM
  });

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["ID", "Vendor ID", "Vendor", "Invoice #", "Date", "Amount", "Status", "PO Number"];
    const csvContent = [
      headers.join(","),
      ...filteredInvoices.map(inv => [
        inv.id,
        inv.vendorCode || "",
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

  // Refined Dashboard Actions - Unified for all roles
  const dashboardActions = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
      {isAdmin && <RoleSwitcher />}

      {/* Search Bar - Global for Dashboard */}
      <div className="flex items-center bg-white/40 border border-white/60 rounded-xl px-2.5 sm:px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all flex-1 md:flex-none min-w-[120px] md:min-w-0">
        <Icon name="Search" size={14} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-[11px] sm:text-xs ml-2 w-full md:w-32 xl:w-48 placeholder:text-slate-400 font-medium"
        />
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 bg-white/40 border border-white/60 rounded-xl p-1 shrink-0">
        <button
          onClick={handleExportCSV}
          className="h-8 w-8 flex items-center justify-center text-slate-500 rounded-lg hover:bg-white hover:text-indigo-600 transition-all"
          title="Export CSV"
        >
          <Icon name="Download" size={15} />
        </button>
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="h-8 w-8 flex items-center justify-center text-slate-500 rounded-lg hover:bg-white hover:text-indigo-600 transition-all cursor-pointer">
            <Icon name="Filter" size={15} />
          </label>
          <ul tabIndex={0} className="dropdown-content z-[60] menu p-2 shadow-2xl bg-white/90 backdrop-blur-xl rounded-2xl w-48 sm:w-56 border border-white/60 mt-3">
            <div className="px-4 py-2 border-b border-slate-50 mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter by Status</p>
            </div>
            <li><button onClick={() => setStatusFilter("ALL")} className={`text-xs font-bold py-2 rounded-xl hover:bg-slate-50 ${statusFilter === 'ALL' ? 'text-indigo-600' : 'text-slate-600'}`}>All Invoices</button></li>
            <li><button onClick={() => setStatusFilter("RECEIVED")} className={`text-xs font-bold py-2 rounded-xl hover:bg-slate-50 ${statusFilter === 'RECEIVED' ? 'text-indigo-600' : 'text-slate-600'}`}>Received</button></li>
            <li><button onClick={() => setStatusFilter("DIGITIZING")} className={`text-xs font-bold py-2 rounded-xl hover:bg-slate-50 ${statusFilter === 'DIGITIZING' ? 'text-blue-600' : 'text-slate-600'}`}>Digitizing</button></li>
            <li><button onClick={() => setStatusFilter("VALIDATION_REQUIRED")} className={`text-xs font-bold py-2 rounded-xl hover:bg-slate-50 ${statusFilter === 'VALIDATION_REQUIRED' ? 'text-info' : 'text-slate-600'}`}>Needs Review</button></li>
            <li><button onClick={() => setStatusFilter("VERIFIED")} className={`text-xs font-bold py-2 rounded-xl hover:bg-slate-50 ${statusFilter === 'VERIFIED' ? 'text-emerald-600' : 'text-slate-600'}`}>Verified</button></li>
            <li><button onClick={() => setStatusFilter("MATCH_DISCREPANCY")} className={`text-xs font-bold py-2 rounded-xl hover:bg-slate-50 ${statusFilter === 'MATCH_DISCREPANCY' ? 'text-orange-600' : 'text-slate-600'}`}>Discrepancy</button></li>
            <li><button onClick={() => setStatusFilter("PENDING_APPROVAL")} className={`text-xs font-bold py-2 rounded-xl hover:bg-slate-50 ${statusFilter === 'PENDING_APPROVAL' ? 'text-amber-600' : 'text-slate-600'}`}>Pending Approval</button></li>
            <li><button onClick={() => setStatusFilter("APPROVED")} className={`text-xs font-bold py-2 rounded-xl hover:bg-slate-50 ${statusFilter === 'APPROVED' ? 'text-green-600' : 'text-slate-600'}`}>Approved</button></li>
            <li><button onClick={() => setStatusFilter("PAID")} className={`text-xs font-bold py-2 rounded-xl hover:bg-slate-50 ${statusFilter === 'PAID' ? 'text-emerald-600' : 'text-slate-600'}`}>Paid</button></li>
            <li><button onClick={() => setStatusFilter("REJECTED")} className={`text-xs font-bold py-2 rounded-xl hover:bg-slate-50 ${statusFilter === 'REJECTED' ? 'text-red-600' : 'text-slate-600'}`}>Rejected</button></li>
          </ul>
        </div>
      </div>

      {/* New Invoice Button - Hidden for Admins/PMs/Vendors/Finance */}
      {!isPM && !isVendor && !isAdmin && !isFinance && (
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center justify-center gap-2 h-10 px-4 bg-linear-to-br from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all whitespace-nowrap"
        >
          <Icon name="Plus" size={15} /> <span className="hidden xs:inline">New Invoice</span><span className="xs:hidden">New</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="pb-10"> {/* Removed negative margin for better layout consistency */}
      {/* Unified Page Header */}
      <PageHeader
        title={isPM ? "Project Command" : isAdmin ? "Admin Control Center" : "Financial Command"}
        subtitle={isPM ? "Assigned Projects Overview" : isAdmin ? "System administration & governance" : "Real-time Control"}
        icon={isPM ? "Briefcase" : isAdmin ? "Shield" : "LayoutDashboard"}
        accent={isPM ? "blue" : isAdmin ? "purple" : "indigo"}
        actions={dashboardActions}
      />

      {isVendor ? (
        <VendorPortal onUploadClick={() => setIsUploadModalOpen(true)} />
      ) : isAdmin ? (
        <AdminDashboard invoices={invoices} onRefresh={fetchData} />
      ) : isPM ? (
        <ProjectManagerDashboard user={user} invoices={invoices} filteredInvoices={filteredInvoices} onUploadComplete={handleUploadComplete} />
      ) : isFinance ? (
        <FinanceUserDashboard invoices={invoices} onUploadComplete={handleUploadComplete} statusFilter={statusFilter} searchQuery={searchQuery} />
      ) : (
        <>
          {activeTab === 'analytics' ? (
            <AnalyticsView user={user} invoices={invoices} />
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
                            <p className="font-semibold text-sm">{inv.vendorCode && <span className="font-mono text-indigo-600 mr-1">{inv.vendorCode}</span>}{inv.vendorName}</p>
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
          )
          }
        </>
      )}
      {/* Global Upload Modal */}
      <dialog id="upload_modal" className={`modal ${isUploadModalOpen ? 'modal-open' : ''} modal-bottom sm:modal-middle`}>
        <div className="modal-box w-full max-w-2xl bg-white p-0 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col">
          <div className="p-6 border-b bg-gray-50 flex justify-between items-center shrink-0">
            <div>
              <h3 className="font-black text-lg sm:text-xl text-gray-800 uppercase tracking-tight">Submit New Invoices</h3>
              <p className="text-[10px] sm:text-xs text-primary mt-1 uppercase font-bold tracking-wider">Secure ERP Ingestion Portal</p>
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