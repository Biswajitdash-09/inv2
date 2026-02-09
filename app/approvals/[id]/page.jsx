"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/constants/roles";
import { getInvoiceStatus, transitionWorkflow } from "@/lib/api";
import ThreeWayMatch from "@/components/Matching/ThreeWayMatch";
import AuditTrail from "@/components/Workflow/AuditTrail";
import ApprovalActions from "@/components/Workflow/ApprovalActions";
import Icon from "@/components/Icon";
import Link from "next/link";
import { motion } from "framer-motion";

// Inline component for restoring rejected/approved invoices
function RestoreToReviewButton({ invoiceId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRestore = async () => {
    setLoading(true);
    try {
      await transitionWorkflow(invoiceId, "RESTORE", "Restored to review by admin");
      router.refresh();
      setTimeout(() => router.push("/approvals"), 500);
    } catch (error) {
      console.error("Failed to restore invoice:", error);
      alert("Failed to restore invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="mt-4 btn btn-sm btn-ghost bg-white/60 border border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300 gap-2"
      >
        <Icon name="RotateCcw" size={16} /> Restore to Review
      </button>
    );
  }

  return (
    <div className="mt-4 p-4 bg-white/80 rounded-xl border border-slate-200 space-y-3">
      <p className="text-sm font-medium text-slate-700">Restore this invoice to review status?</p>
      <div className="flex gap-2">
        <button
          onClick={() => setShowConfirm(false)}
          disabled={loading}
          className="btn btn-sm btn-ghost flex-1"
        >
          Cancel
        </button>
        <button
          onClick={handleRestore}
          disabled={loading}
          className="btn btn-sm btn-primary flex-1 gap-2"
        >
          {loading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <Icon name="RotateCcw" size={14} />
          )}
          Confirm Restore
        </button>
      </div>
    </div>
  );
}


export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [invoice, setInvoice] = useState(null);
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

  useEffect(() => {
    if (authLoading || !user) return; // Wait for auth

    const fetchInvoice = async () => {
      try {
        const foundInvoice = await getInvoiceStatus(params.id);

        if (!foundInvoice) {
          router.push("/approvals");
          return;
        }

        setInvoice(foundInvoice);
      } catch (error) {
        console.error("Failed to fetch invoice:", error);
        router.push("/approvals");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchInvoice();
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <span className="loading loading-infinity loading-lg text-amber-500 mb-4"></span>
          <p className="text-gray-500">Loading invoice context...</p>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const isProcessed = ["APPROVED", "REJECTED", "PAID"].includes(invoice.status);

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto space-y-4 pb-10">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link
          href="/approvals"
          className="hover:text-primary transition-colors flex items-center gap-1"
        >
          <Icon name="ArrowLeft" size={14} /> Back to Approvals
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-700">{invoice.id}</span>
        <span>/</span>
        <span className="text-amber-600">Final Review</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left Panel: Context (Three-Way Match Read-Only) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-2 space-y-4 min-w-0"
        >
          {/* Info Banner */}
          <div className="alert bg-blue-50 border-blue-200 text-blue-800 shadow-sm">
            <Icon name="Info" size={20} />
            <div>
              <h3 className="font-bold text-sm">Review Context</h3>
              <div className="text-xs">
                Review the matching analysis below. This section is read-only for final approval context.
              </div>
            </div>
          </div>

          {/* Wrapper: scrollable content, Read Only badge with clear spacing */}
          <div className="relative rounded-2xl overflow-hidden border border-gray-200/50 bg-gray-50/50">
            <div className="overflow-x-auto min-w-0">
              <div className="pointer-events-none opacity-90 grayscale-[0.05] p-4 min-w-[640px]">
                <ThreeWayMatch invoice={invoice} />
              </div>
            </div>
            <div className="absolute top-3 right-3 z-20 pointer-events-none flex items-center gap-2">
              <span className="badge badge-ghost bg-white/90 backdrop-blur text-[10px] font-mono uppercase tracking-widest border border-gray-200 shadow-sm py-1.5 px-2">
                Read Only View
              </span>
            </div>
          </div>
        </motion.div>

        {/* Right Panel: Workflow Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-1 space-y-6 min-w-0 shrink-0"
        >
          {/* Approval Actions */}
          {!isProcessed ? (
            <ApprovalActions
              invoiceId={invoice.id}
              onActionComplete={(newStatus) => {
                // Optimistically update the UI to show success state immediately
                setInvoice(prev => ({ ...prev, status: newStatus }));
              }}
            />
          ) : (
            <div
              className={`p-6 rounded-2xl border ${invoice.status === "APPROVED" || invoice.status === "PAID"
                ? "bg-success/10 border-success/30 text-success-content"
                : "bg-error/10 border-error/30 text-error-content"
                } flex flex-col items-center justify-center text-center space-y-3`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${invoice.status === "APPROVED" || invoice.status === "PAID" ? "bg-success text-white" : "bg-error text-white"
                  }`}
              >
                <Icon
                  name={invoice.status === "APPROVED" || invoice.status === "PAID" ? "Check" : "X"}
                  size={32}
                />
              </div>
              <h3 className="text-xl font-bold uppercase">
                Invoice {invoice.status === "PAID" ? "Paid" : invoice.status}
              </h3>
              <p className="text-sm opacity-80">
                {invoice.status === "PAID"
                  ? "This invoice has been paid. No further actions can be taken."
                  : "This workflow has been finalized. You can restore it for re-review if needed."}
              </p>
              {invoice.status !== "PAID" && (
                <RestoreToReviewButton invoiceId={invoice.id} />
              )}
            </div>
          )}

          {/* Audit Trail */}
          <AuditTrail invoice={invoice} />
        </motion.div>
      </div>
    </div>
  );
}