"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import Button from "@/components/ui/Button";
import { transitionWorkflow, getInvoiceStatus } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/constants/roles";
import clsx from "clsx";

const ThreeWayMatch = ({ invoice: initialInvoice }) => {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);

  // Use backend data
  const matchResult = invoice?.matching || {};
  const purchaseOrder = matchResult.poData;
  const goodsReceipt = matchResult.grData;
  const matchStatus = invoice?.status === 'VERIFIED' ? 'matched' :
    invoice?.status === 'MATCH_DISCREPANCY' ? 'discrepancy' : 'analyzing';

  // --- Real-time Polling for Status Updates ---
  useEffect(() => {
    if (['RECEIVED', 'DIGITIZING', 'PROCESSING'].includes(invoice?.status)) {
      const interval = setInterval(async () => {
        try {
          // Poll specifically for this invoice's latest status
          const updated = await getInvoiceStatus(invoice.id);
          if (updated && updated.status !== invoice.status) {
            setInvoice(updated);
            if (['VERIFIED', 'MATCH_DISCREPANCY'].includes(updated.status)) {
              clearInterval(interval);
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [invoice?.id, invoice?.status]);

  // Trigger Match if not yet run (e.g. if we land here and status is VALIDATION_REQUIRED)
  useEffect(() => {
    if (invoice?.status === 'VALIDATION_REQUIRED' && !invoice.matching) {
      handleRunMatch();
    }
  }, []);

  const handleRunMatch = async () => {
    try {
      // Call API to run matching logic
      await transitionWorkflow(invoice.id, 'PROCESS_MATCH', "Initiating automated matching");
      // Polling will pick up the result
    } catch (e) {
      console.error("Failed to run match", e);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const response = await transitionWorkflow(invoice.id, 'APPROVE', "Automated match confirmed by user.");
      setInvoice(response.invoice);
      router.push("/matching");
    } catch (error) {
      console.error("Match approval error", error);
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const response = await transitionWorkflow(invoice.id, 'REJECT', "Discrepancy flagged by user.");
      setInvoice(response.invoice);
      router.push("/matching");
    } catch (error) {
      console.error("Flag error", error);
    } finally {
      setProcessing(false);
    }
  };

  // Helper to check permissions
  const canApprove = () => {
    if (!user) return false;
    return hasPermission(user, 'APPROVE_MATCH');
  };

  if (!invoice) return null;

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 pb-12 animate-in fade-in duration-700">
      {/* 1. Premium Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/60 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-5 min-w-0 flex-1">
          <div className="p-3 bg-primary/10 rounded-2xl ring-1 ring-primary/20">
            <Icon name="ShieldCheck" className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Triple Verification Hub</h2>
            <div className="flex items-center gap-3 mt-1">
              {matchStatus === "analyzing" && (
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span> System Scanning...
                </span>
              )}
              {matchStatus === "matched" && (
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100/50">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse"></span> Identity Verified
                </span>
              )}
              {matchStatus === "discrepancy" && (
                <span className="text-[11px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2 px-3 py-1 bg-rose-50 rounded-full border border-rose-100/50">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-pulse"></span> Discrepancy Found
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <Button
            variant="ghost"
            disabled={matchStatus === "analyzing" || processing}
            onClick={handleReject}
            className="h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm"
          >
            Reject
          </Button>
          <Button
            variant="ghost"
            disabled={!canApprove() || matchStatus === "analyzing" || processing}
            onClick={handleApprove}
            loading={processing}
            className="h-12 px-10 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 border-none disabled:cursor-not-allowed"
          >
            {matchStatus === 'discrepancy' ? 'Override & Approve' : 'Approve Match'}
          </Button>
        </div>
      </div>

      {/* 2. Enhanced Data Context Bar - scroll on narrow so nothing is cut off */}
      <div className="overflow-x-auto min-w-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 bg-white p-5 md:p-7 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group min-w-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>

        <div className="space-y-1.5 border-r border-slate-100 last:border-none pr-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Icon name="User" size={12} className="text-slate-300" /> Vendor Registry
          </p>
          <p className="text-lg font-bold text-slate-800 truncate">{invoice.vendorName}</p>
        </div>
        <div className="space-y-1.5 border-r border-slate-100 last:border-none pr-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Icon name="FileText" size={12} className="text-slate-300" /> Document ID
          </p>
          <p className="text-lg font-bold text-slate-800 font-mono italic tracking-tighter">{invoice.invoiceNumber || invoice.id}</p>
        </div>
        <div className="space-y-1.5 border-r border-slate-100 last:border-none pr-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Icon name="Activity" size={12} className="text-slate-300" /> Status Flag
          </p>
          <div className="flex items-center">
            <span className={clsx(
              "text-[10px] font-black uppercase tracking-tight px-3 py-1 rounded-full",
              invoice.status.includes('DISCREPANCY') ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
            )}>
              {invoice.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="space-y-1.5 min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Icon name="Hash" size={12} className="text-slate-300 shrink-0" /> PO Channel
          </p>
          <p className="text-lg font-bold text-purple-600 font-mono truncate">
            {invoice.poNumber || "NOT_PROVIDED"}
          </p>
        </div>
        </div>
      </div>

      {/* 3. The Professional Verification Table */}
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800">
                <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Inventory / Service Line</th>
                <th colSpan="2" className="px-6 py-6 text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] bg-primary/5 text-center border-l border-white/5">Invoice Data</th>
                <th colSpan="2" className="px-6 py-6 text-[11px] font-black text-purple-400 uppercase tracking-[0.2em] bg-purple-500/5 text-center border-l border-white/5">PO Ref</th>
                <th className="px-8 py-6 text-[11px] font-black text-orange-400 uppercase tracking-[0.2em] bg-orange-500/5 text-center border-l border-white/5">GR Units</th>
                <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Match</th>
              </tr>
              <tr className="bg-slate-900/95 text-[10px] font-black text-slate-500 border-b border-slate-800">
                <th className="px-10 py-3 uppercase tracking-widest">Description</th>
                <th className="px-6 py-3 border-l border-white/5 text-center">Qty</th>
                <th className="px-6 py-3 text-center">Unit Price</th>
                <th className="px-6 py-3 border-l border-white/5 text-center">Qty</th>
                <th className="px-6 py-3 text-center">Unit Price</th>
                <th className="px-8 py-3 border-l border-white/5 text-center">Received</th>
                <th className="px-10 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(invoice.items || []).map((invItem, idx) => {
                const poItem = purchaseOrder?.items[idx] || {};
                const grItem = goodsReceipt?.items[idx] || {};

                // Logic already handled in backend, but we need to visualize diffs here for UI
                // We can use the same simple comparison for display purposes
                const priceMatch = Math.abs(invItem.unitPrice - (poItem.unitPrice || 0)) < 0.01;
                const qtyMatch = invItem.quantity === (poItem.quantity || 0) && invItem.quantity === (grItem.quantity || 0);
                const rowMatch = priceMatch && qtyMatch;

                return (
                  <tr key={idx} className={clsx(
                    "group transition-all duration-300",
                    rowMatch ? "hover:bg-emerald-50/40" : "bg-rose-50/10 hover:bg-rose-50/30"
                  )}>
                    <td className="px-10 py-5">
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-1.5 h-1.5 rounded-full", rowMatch ? "bg-emerald-400" : "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]")}></div>
                        <p className="text-sm font-bold text-slate-800 truncate max-w-[280px]">{invItem.description}</p>
                      </div>
                    </td>

                    {/* Invoice Data */}
                    <td className="px-6 py-5 border-l border-slate-50 text-center">
                      <span className="text-sm font-mono font-bold text-slate-500">{invItem.quantity}</span>
                    </td>
                    <td className="px-6 py-5 text-center font-black">
                      <span className="text-sm text-slate-900">${invItem.unitPrice}</span>
                    </td>

                    {/* PO Reference */}
                    <td className={clsx("px-6 py-5 border-l border-slate-50 text-center bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors")}>
                      <span className={clsx("text-sm font-mono font-bold", invItem.quantity === poItem.quantity ? "text-slate-400" : "text-rose-600 underline decoration-dotted font-black")}>
                        {poItem.quantity || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors font-black">
                      <span className={clsx("text-sm", priceMatch ? "text-slate-700" : "text-rose-600 bg-rose-100/50 px-2 py-1 rounded-lg border border-rose-200 shadow-sm")}>
                        ${poItem.unitPrice || '-'}
                      </span>
                    </td>

                    {/* GR Data */}
                    <td className="px-8 py-5 border-l border-slate-50 text-center bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors font-black">
                      <span className={clsx("text-sm", invItem.quantity === (grItem.quantity || grItem.accepted) ? "text-orange-600" : "text-rose-600 font-extrabold animate-pulse")}>
                        {grItem.quantity || grItem.accepted || '0'}
                      </span>
                    </td>

                    {/* Row Status */}
                    <td className="px-10 py-5 text-right">
                      <div className={clsx(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all",
                        rowMatch ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100 shadow-sm"
                      )}>
                        <Icon name={rowMatch ? "CheckCircle" : "AlertCircle"} size={14} />
                        {rowMatch ? 'Exact' : 'Error'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Section */}
        <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left">Invoiced Total</p>
              <p className="text-2xl font-black text-slate-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(invoice.amount || 0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left">PO Authorized</p>
              <p className={clsx("text-2xl font-black", purchaseOrder && Math.abs((invoice.amount || 0) - purchaseOrder.totalAmount) < 0.01 ? "text-slate-900" : "text-rose-600")}>
                {purchaseOrder ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(purchaseOrder.totalAmount) : '---'}
              </p>
            </div>
          </div>

          {matchResult.discrepancies?.length > 0 && (
            <div className="flex-1 max-w-md p-5 bg-rose-50 border border-rose-100 rounded-[1.5rem] space-y-2.5 shadow-inner">
              {matchResult.discrepancies.map((d, i) => (
                <div key={i} className="flex items-center gap-3 text-[11px] font-bold text-rose-700 uppercase tracking-tight">
                  <Icon name="AlertCircle" size={16} className="shrink-0 animate-pulse" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreeWayMatch;