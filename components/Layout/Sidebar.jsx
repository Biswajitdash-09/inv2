"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { APP_VERSION } from "@/lib/version";
import { useAuth } from "@/context/AuthContext";
import { canSeeMenuItem, ROLES, getNormalizedRole } from "@/constants/roles";
import { useRouter } from "next/navigation";

const SIDEBAR_COLLAPSED_KEY = "invoiceflow-sidebar-collapsed";

const menuItems = [
  { name: "Dashboard", icon: "LayoutDashboard", path: "/dashboard" },
  { name: "Messages", icon: "Mail", path: "/pm/messages" },
  { name: "Approvals", icon: "CheckCircle", path: "/pm/approvals" },
  { name: "PM Approval Queue", icon: "ClipboardCheck", path: "/pm/approval-queue" },
  { name: "Documents", icon: "FileText", path: "/pm/documents" },
  { name: "Analytics", icon: "BarChart3", path: "/analytics" },
  { name: "Finance Approval Queue", icon: "ListChecks", path: "/finance/approval-queue" },
  { name: "Manual Entry", icon: "FilePlus", path: "/finance/manual-entry" },
  { name: "Configuration", icon: "Settings", path: "/config" },
  { name: "User Management", icon: "Shield", path: "/users" },
  { name: "Audit Logs", icon: "FileText", path: "/audit" },
  { name: "Rate Cards", icon: "Layers", path: "/admin/ratecards" },
  { name: "Hierarchy", icon: "GitBranch", path: "/admin/hierarchy" },
  { name: "Re-check Requests", icon: "AlertCircle", path: "/vendors/rechecks" },
];

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recheckUnreadCount, setRecheckUnreadCount] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored !== null) setCollapsed(JSON.parse(stored));
    } catch (_) { }
  }, []);

  // Fetch unread messages count
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/pm/messages?type=inbox', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch unread count in sidebar', err);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 8000); // Sync with dashboard (8s)
    return () => clearInterval(interval);
  }, [user]);

  // Fetch re-check unread count for vendor users
  useEffect(() => {
    if (!user) return;
    const role = getNormalizedRole(user);
    if (role !== ROLES.VENDOR) return;

    const fetchRecheckUnread = async () => {
      try {
        const res = await fetch('/api/vendor/rechecks', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setRecheckUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch recheck unread count in sidebar', err);
      }
    };

    fetchRecheckUnread();
    const interval = setInterval(fetchRecheckUnread, 8000); // Sync with dashboard (8s)
    return () => clearInterval(interval);
  }, [user]);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(next));
      } catch (_) { }
      return next;
    });
  };

  // Dynamic menu path replacement based on role
  // - "Dashboard" points to the role-specific landing page
  // - "Messages" points to the correct messages area per role
  const dynamicMenuItems = menuItems.map(item => {
    if (user) {
      const role = getNormalizedRole(user);

      if (item.name === 'Dashboard') {
        if (role === ROLES.FINANCE_USER) return { ...item, path: '/finance/dashboard' };
        if (role === ROLES.PROJECT_MANAGER) return { ...item, path: '/pm/dashboard' };
        if (role === ROLES.ADMIN) return { ...item, path: '/admin/dashboard' };
        if (role === ROLES.VENDOR) return { ...item, path: '/vendors' };
      }

      if (item.name === 'Messages') {
        if (role === ROLES.ADMIN) return { ...item, path: '/admin/messages' };
        // PM and Vendor already use /pm/messages as shared messaging area
        if (role === ROLES.PROJECT_MANAGER || role === ROLES.VENDOR) {
          return { ...item, path: '/pm/messages' };
        }
      }

      if (item.name === 'Rate Cards') {
        if (role === ROLES.PROJECT_MANAGER) return { ...item, path: '/pm/rate-cards' };
        if (role === ROLES.FINANCE_USER) return { ...item, path: '/finance/rate-cards' };
        if (role === ROLES.VENDOR) return { ...item, path: '/vendors/rate-cards' }; // Or show on dashboard
      }

      if (item.name === 'Hierarchy') {
        return { ...item, path: '/admin/hierarchy' };
      }
    }

    return item;
  });

  const filteredMenuItems = dynamicMenuItems.filter(item => canSeeMenuItem(user, item.name));

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={clsx(
          "flex-col h-screen sticky top-0 z-50 pt-6 pb-6 transition-[width,transform] duration-300 ease-in-out",
          // Desktop styles
          "hidden lg:flex pl-6 pr-0", // Adjusted padding for better glass effect
          !mobileOpen && (collapsed ? "w-[5.5rem]" : "w-72"), // Slightly more space for icons when collapsed
          // Mobile Styles (Drawer mode)
          mobileOpen ? "!flex fixed inset-y-0 left-0 w-[280px] sx:w-80 p-4 lg:p-6 bg-slate-50/10 backdrop-blur-xl" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="glass-panel h-full rounded-3xl flex flex-col justify-between overflow-hidden p-3 relative border border-white/20 shadow-xl bg-white/80">

          {/* Brand + Toggle */}
          <div className={clsx("shrink-0 min-h-[4.5rem] mb-4 relative z-10 flex items-center", collapsed ? "flex-col justify-center gap-2" : "flex-row justify-between gap-2 px-2")}>
            <Link href="/dashboard" className={clsx("flex items-center gap-3 min-w-0", collapsed && "justify-center")}>
              <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 ring-1 ring-black/5 flex-shrink-0">
                <Icon name="Zap" className="text-white shrink-0" size={26} strokeWidth={2.5} />
              </div>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent whitespace-nowrap overflow-hidden"
                  >
                    InvoiceFlow
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            {/* Desktop Collapse Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden lg:block shrink-0 p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon name={collapsed ? "PanelRightOpen" : "PanelLeftClose"} size={20} />
            </button>
            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden shrink-0 p-2 rounded-lg text-gray-500 hover:text-error hover:bg-error/10 transition-colors"
            >
              <Icon name="X" size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto overflow-x-hidden pr-1 scrollbar-hide">
            {filteredMenuItems.map((item) => {
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className="block relative group"
                  onClick={() => setMobileOpen(false)} // Close on mobile navigation
                  title={collapsed ? item.name : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div
                    className={clsx(
                      "relative flex items-center rounded-xl transition-colors duration-200",
                      collapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3",
                      isActive ? "text-primary font-semibold" : "text-gray-500 hover:text-gray-900 hover:bg-white/30"
                    )}
                  >
                    <Icon
                      name={item.icon}
                      size={22}
                      className={clsx("shrink-0", isActive ? "text-primary" : "text-gray-400 group-hover:text-primary transition-colors")}
                    />
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="truncate flex-1"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {!collapsed && item.name === 'Messages' && unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-error text-white text-[9px] font-black rounded-lg ml-auto">
                        {unreadCount}
                      </span>
                    )}
                    {!collapsed && item.name === 'Re-check Requests' && recheckUnreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-lg ml-auto animate-pulse">
                        {recheckUnreadCount}
                      </span>
                    )}
                    {!collapsed && isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Version + Online Status */}
          <div className="shrink-0 mt-auto pt-4 border-t border-gray-200/30">
            <div className={clsx("flex items-center", collapsed ? "justify-center px-0" : "justify-between px-2 gap-2")}>
              {!collapsed && <span className="text-xs font-mono text-gray-400">v{APP_VERSION}</span>}
              <div className="w-2 h-2 rounded-full bg-success/60 animate-pulse shrink-0" title="System Online" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;