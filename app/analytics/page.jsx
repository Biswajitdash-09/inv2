"use client";

import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import AnalyticsDashboard from "@/components/Analytics/AnalyticsDashboard";
import SyncIndicator from "@/components/Integration/SyncIndicator";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto h-full pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600">
              <Icon name="BarChart2" size={28} />
            </div>
            Analytics & Insights
          </h1>
          <p className="text-gray-500 mt-2 ml-14 max-w-xl">
            Real-time performance metrics and spending analysis across your organization.
          </p>
        </div>
        <SyncIndicator />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AnalyticsDashboard />
      </motion.div>
    </div>
  );
}