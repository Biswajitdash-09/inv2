"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/constants/roles";
import { getAllInvoices } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import PageHeader from "@/components/Layout/PageHeader";

export default function ApprovalsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (![ROLES.ADMIN, ROLES.PROJECT_MANAGER].includes(user.role)) {
        router.push("/dashboard");
      }
    }
  }, [user, authLoading, router]);

  // Invoices needing managerial review (vendor submissions + pending approval)
  const APPROVAL_WORKFLOW_STATUSES = [
    "RECEIVED",
    "DIGITIZING",
    "VALIDATION_REQUIRED",
    "VERIFIED",
    "MATCH_DISCREPANCY",
    "PENDING_APPROVAL",
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const allInvoices = await getAllInvoices();
        const forReview = allInvoices.filter((inv) =>
          APPROVAL_WORKFLOW_STATUSES.includes(inv.status)
        );
        setInvoices(forReview);
      } catch (error) {
        console.error("Failed to load approvals", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto h-full pb-10">
      <PageHeader
        title="Admin Approval Workflow"
        subtitle="Pending invoices requiring managerial review and final sign-off. Vendor submissions appear here for review."
        icon="Stamp"
        accent="amber"
      />
      <div className="flex gap-2 justify-end">
        <button className="btn btn-sm btn-ghost bg-white/40 border border-white/60 shadow-sm gap-2">
          <Icon name="Filter" size={16} /> Filter
        </button>
        <button className="btn btn-sm btn-ghost bg-white/40 border border-white/60 shadow-sm gap-2">
          <Icon name="SortDesc" size={16} /> Sort
        </button>
      </div>

      {/* Main Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <span className="loading loading-bars loading-lg text-amber-500"></span>
            <p className="text-gray-500 animate-pulse">Retrieving pending approvals...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-gray-400 bg-white/20 rounded-2xl border border-white/40 backdrop-blur-md">
            <Icon name="CheckCircle" size={48} className="mb-4 opacity-50 text-success" />
            <p className="text-lg font-medium text-gray-600">All caught up!</p>
            <p className="text-sm">No vendor submissions or invoices pending approval.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {invoices.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative flex flex-col p-6 rounded-2xl bg-white/40 border border-white/50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {/* Header: status badge top-right */}
                <div className="flex justify-end mb-3">
                  <span className="badge badge-warning bg-amber-500/10 text-amber-700 border-none font-semibold text-[10px] uppercase tracking-wide whitespace-nowrap">
                    {invoice.status?.replace(/_/g, " ") || "Pending"}
                  </span>
                </div>

                {/* Identity block: icon + stacked invoice name, inv-id, vendor-id, vendor name */}
                <div className="flex gap-3 mb-4">
                  <div className="w-12 h-12 shrink-0 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                    <Icon name="FileClock" size={24} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Invoice name</p>
                      <p className="font-bold text-gray-800 text-sm leading-tight line-clamp-2 mt-0.5" title={invoice.originalName || invoice.vendorName}>
                        {invoice.originalName || invoice.vendorName || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Invoice ID</p>
                      <p className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 inline-block mt-0.5">
                        {invoice.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Vendor ID</p>
                      <p className="mt-0.5">
                        {invoice.vendorCode ? (
                          <span className="font-mono text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                            {invoice.vendorCode}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Vendor name</p>
                      <p className="text-sm font-medium text-gray-700 truncate mt-0.5">{invoice.vendorName || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Details: aligned label | value grid */}
                <div className="flex-1 mb-5">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
                    <dt className="text-gray-500 min-w-[5rem]">Amount</dt>
                    <dd className="text-right font-bold text-gray-800">
                      {invoice.amount != null
                        ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(invoice.amount)
                        : "—"}
                    </dd>
                    <dt className="text-gray-500">Submitted</dt>
                    <dd className="text-right text-gray-700">
                      {invoice.receivedAt ? new Date(invoice.receivedAt).toLocaleDateString() : invoice.dueDate || "—"}
                    </dd>
                    <dt className="text-gray-500">Category</dt>
                    <dd className="text-right text-gray-700">{invoice.category || "—"}</dd>
                  </dl>
                </div>

                {/* Action: only Review & Approve */}
                <div className="mt-2">
                  <Link href={`/approvals/${invoice.id}`} className="w-full block">
                    <button className="btn btn-warning btn-outline w-full hover:text-white! shadow-lg shadow-warning/10 group-hover:scale-[1.02] transition-transform gap-2">
                      Review & Approve
                      <Icon name="ArrowRight" size={18} />
                    </button>
                  </Link>
                </div>

                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-br from-white/20 to-transparent rounded-tr-2xl pointer-events-none -z-10" aria-hidden></div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}