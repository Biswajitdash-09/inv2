"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInvoiceStatus } from "@/lib/api";
import ThreeWayMatch from "@/components/Matching/ThreeWayMatch";
import Icon from "@/components/Icon";
import Link from "next/link";
import { motion } from "framer-motion";

export default function MatchingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const foundInvoice = await getInvoiceStatus(params.id);

        if (!foundInvoice) {
          router.push("/matching");
          return;
        }

        setInvoice(foundInvoice);
      } catch (error) {
        console.error("Failed to fetch invoice:", error);
        router.push("/matching");
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
          <span className="loading loading-infinity loading-lg text-primary mb-4"></span>
          <p className="text-gray-500">Retrieving PO & GR data...</p>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full max-w-7xl mx-auto space-y-4"
    >
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/matching" className="hover:text-primary transition-colors flex items-center gap-1">
          <Icon name="ArrowLeft" size={14} /> Back to Matching List
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-700">{invoice.id}</span>
        <span>/</span>
        <span className="text-blue-600">3-Way Match</span>
      </div>

      <div className="pb-10">
        <ThreeWayMatch invoice={invoice} />
      </div>
    </motion.div>
  );
}