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
    <div className="max-w-[1000px] mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* 1. Light-Theme Premium Action Header */}
      <div className="relative group overflow-hidden bg-white p-7 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(71,85,105,0.12)] border border-slate-100 transition-all duration-500 hover:shadow-[0_30px_60px_-12px_rgba(71,85,105,0.18)]">
        {/* Subtle Decorative Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-50/50 blur-[80px] rounded-full -ml-24 -mb-24"></div>

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"></div>
              <div className="relative p-3.5 bg-white rounded-2xl border border-indigo-50 shadow-sm">
                <Icon name="ShieldCheck" className="text-indigo-600" size={28} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black tracking-tighter text-slate-900">
                  Verification Engine
                </h2>
                <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 uppercase tracking-[0.2em] shadow-sm">v2.1</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 leading-none">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Automated Integrity Audit</p>
                <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                    </span>
                    Live Analysis
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              disabled={matchStatus === "analyzing" || processing}
              onClick={handleReject}
              className="h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] bg-white border-2 border-rose-500 text-slate-900 hover:bg-rose-500 hover:text-white hover:shadow-[0_10px_20px_-5px_rgba(244,63,94,0.3)] transition-all duration-300"
            >
              Flag Reject
            </Button>
            <Button
              variant="ghost"
              disabled={!canApprove() || matchStatus === "analyzing" || processing}
              onClick={handleApprove}
              loading={processing}
              className="h-12 px-10 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] bg-white border-2 border-emerald-500 text-slate-900 hover:bg-emerald-500 hover:text-white hover:shadow-[0_10px_20px_-5px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {matchStatus === 'discrepancy' ? 'Approve' : 'Authorize Match'}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. The Paper Invoice Document */}
      <div className="bg-white rounded-[1rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden relative">
        {/* Verification Status Banner */}
        <div className={clsx(
          "h-1.5 w-full",
          matchStatus === "matched" ? "bg-emerald-500" :
            matchStatus === "discrepancy" ? "bg-rose-500" : "bg-indigo-500"
        )}></div>

        {/* Invoice Body */}
        <div className="p-10 sm:p-16 space-y-12">
          {/* Header Section: Branding vs Bill To */}
          <div className="flex flex-col md:flex-row justify-between gap-12 border-b border-slate-100 pb-12">
            <div className="space-y-4 max-w-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                  <Icon name="Zap" size={24} />
                </div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{invoice.vendorName}</h1>
              </div>
              <div className="text-sm font-bold text-slate-400 leading-relaxed uppercase tracking-wide">
                123 Business Avenue, Suite 400<br />
                Silicon Valley, CA 94043<br />
                contact@{(invoice.vendorName || "vendor").toLowerCase().replace(/\s+/g, '')}.com
              </div>
            </div>

            <div className="text-right space-y-4">
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Billed To</span>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">AutoInvoice Global Corp.</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">Financial Operations Unit</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={clsx(
                  "text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border",
                  matchStatus === "matched" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    matchStatus === "discrepancy" ? "bg-rose-50 text-rose-600 border-rose-100" :
                      "bg-indigo-50 text-indigo-600 border-indigo-100"
                )}>
                  {matchStatus.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Invoice Date</p>
              <p className="text-sm font-black text-slate-800">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Invoice Number</p>
              <p className="text-sm font-black text-slate-800 font-mono tracking-tighter">#{invoice.invoiceNumber || invoice.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">PO Reference</p>
              <p className="text-sm font-black text-indigo-600 font-mono italic tracking-tighter">{invoice.poNumber || "PENDING"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Payment Terms</p>
              <p className="text-sm font-black text-slate-800">Net 30 Days</p>
            </div>
          </div>

          {/* Itemization Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.25em]">Line Item Breakdown</span>
              <span className="text-[10px] font-bold text-slate-400 italic">Values in INR</span>
            </div>

            <div className="divide-y divide-slate-100 min-w-full overflow-x-auto">
              {(invoice.items || []).map((invItem, idx) => {
                const poItem = purchaseOrder?.items[idx] || {};
                const grItem = goodsReceipt?.items[idx] || {};

                const priceMatch = Math.abs(invItem.unitPrice - (poItem.unitPrice || 0)) < 0.01;
                const qtyMatch = invItem.quantity === (poItem.quantity || 0) && invItem.quantity === (grItem.quantity || 0);
                const rowMatch = priceMatch && qtyMatch;

                return (
                  <div key={idx} className="py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center group">
                    <div className="md:col-span-5 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-300 font-mono">{(idx + 1).toString().padStart(2, '0')}</span>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">{invItem.description}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-8">HSN: 8471 • Services & Hardware</p>
                    </div>

                    <div className="md:col-span-2 text-center bg-slate-50/50 py-3 rounded-xl border border-dashed border-slate-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoiced Qty</p>
                      <p className="text-sm font-black text-slate-800">{invItem.quantity}</p>
                    </div>

                    <div className="md:col-span-2 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit Price</p>
                      <p className="text-sm font-black text-slate-800">₹{invItem.unitPrice.toLocaleString()}</p>
                    </div>

                    <div className="md:col-span-3 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <div className={clsx(
                          "px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
                          rowMatch ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                        )}>
                          <Icon name={rowMatch ? "Check" : "AlertCircle"} size={10} />
                          {rowMatch ? "Verified" : "Discrepancy"}
                        </div>
                        <p className="text-base font-black text-slate-900 tracking-tighter">
                          ₹{(invItem.quantity * invItem.unitPrice).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit & Totals Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-12 border-t-2 border-slate-900">
            <div className="space-y-6">
              <div className="space-y-3">
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.25em] flex items-center gap-2">
                  <Icon name="Activity" size={14} className="text-indigo-600" />
                  Compliance Notes
                </span>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  {matchResult.discrepancies?.length > 0 ? (
                    matchResult.discrepancies.map((d, i) => (
                      <div key={i} className="flex gap-4 items-start">
                        <div className="mt-1 p-1 bg-rose-100 text-rose-600 rounded-lg">
                          <Icon name="AlertCircle" size={12} />
                        </div>
                        <p className="text-[11px] font-bold text-rose-700 uppercase leading-loose tracking-wide">{d}</p>
                      </div>
                    ))
                  ) : (
                    <div className="flex gap-4 items-center">
                      <div className="p-1 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Icon name="Check" size={12} />
                      </div>
                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">All audit checks passed successfully.</p>
                    </div>
                  )}
                </div>
              </div>


            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Subtotal</span>
                <span className="text-sm font-black text-slate-800">₹{(invoice.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tax (GST 0%)</span>
                <span className="text-sm font-black text-slate-800">₹0.00</span>
              </div>
              <div className="flex justify-between items-center px-2 pt-4 border-t border-slate-100">
                <span className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Grand Total</span>
                <div className="text-right">
                  <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{(invoice.amount || 0).toLocaleString()}</span>
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Verified Amount (INR)</p>
                </div>
              </div>

              {/* Legal Footer */}
              <div className="mt-12 pt-8 border-t border-slate-50 text-center">

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeWayMatch;