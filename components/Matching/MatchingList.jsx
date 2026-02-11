"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";

import clsx from "clsx";
import { ROLES, getNormalizedRole } from "@/constants/roles";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

// Safely parse an amount value to a number, returning 0 if unparsable
const safeAmount = (val) => {
  if (val == null || val === '') return 0;
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]/g, '')) : Number(val);
  return isNaN(num) ? 0 : num;
};

// Format a date for display, with fallback
const formatDate = (dateVal) => {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const MatchingList = ({ invoices }) => {
  const { user } = useAuth();

  const userRole = getNormalizedRole(user);
  const filteredInvoices = invoices.filter(inv => {
    if (!user) return true;
    if (userRole === ROLES.ADMIN) return true;
    if (userRole === ROLES.PROJECT_MANAGER) {
      // PMs primarily handle Discrepancies or specific verification
      return inv.status === 'MATCH_DISCREPANCY' || inv.status === 'VERIFIED';
    }
    return true; // Finance handles all
  });

  if (!filteredInvoices || filteredInvoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400 bg-white/20 rounded-2xl border border-white/40 backdrop-blur-md">
        <Icon name="CheckCircle" size={48} className="mb-4 opacity-50 text-success" />
        <p className="text-lg font-medium text-gray-600">All caught up!</p>
        <p className="text-sm">No invoices waiting for your role.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredInvoices.map((invoice, index) => (
        <motion.div
          key={invoice.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group relative flex flex-col p-6 rounded-2xl bg-white/40 border border-white/50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-4 gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shrink-0">
                <Icon name="FileText" size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-800 truncate">{invoice.vendorName}</h3>
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 inline-block max-w-full truncate">
                  {invoice.invoiceNumber || invoice.id}
                </span>
              </div>
            </div>
            <div className={clsx(
              "badge border-none font-semibold text-[10px] shrink-0 max-w-[100px] truncate",
              invoice.status === 'VERIFIED' ? "badge-success text-white" :
                invoice.status === 'MATCH_DISCREPANCY' ? "badge-error text-white" : "badge-info bg-blue-500/10 text-blue-700"
            )} title={invoice.status}>
              {invoice.status === 'MATCH_DISCREPANCY' ? 'DISCREPANCY' : invoice.status}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 mb-6 flex-1">
            <div className="flex justify-between items-center text-sm border-b border-gray-200/50 pb-2">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-gray-800 text-lg">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(safeAmount(invoice.amount))}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Date</span>
              <span className="text-gray-700">{formatDate(invoice.date || invoice.created_at)}</span>
            </div>
            {invoice.items?.length > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Items</span>
                <span className="text-gray-700">{invoice.items.length} Lines</span>
              </div>
            )}
            {invoice.matching?.discrepancies?.length > 0 && (
              <div className="mt-2 p-2 bg-error/5 border border-error/10 rounded-lg text-[10px] text-error">
                <div className="flex items-center gap-1 font-bold mb-1">
                  <Icon name="AlertTriangle" size={10} /> {invoice.matching.discrepancies.length} Discrepancies
                </div>
                <ul className="list-disc ml-3 space-y-0.5 opacity-80">
                  {invoice.matching.discrepancies.slice(0, 2).map((d, i) => (
                    <li key={i} className="truncate">{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action */}
          <Link href={`/matching/${invoice.id}`} className="w-full">
            <button className="btn btn-primary w-full shadow-lg shadow-primary/20 group-hover:scale-[1.02] transition-transform">
              Start Matching
              <Icon name="GitMerge" size={18} />
            </button>
          </Link>

          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-br from-white/20 to-transparent rounded-tr-2xl pointer-events-none"></div>
        </motion.div>
      ))}
    </div>
  );
};

export default MatchingList;