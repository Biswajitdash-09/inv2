"use client";

import Icon from "@/components/Icon";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const accentMap = {
  purple: {
    gradient: "from-purple-600 to-indigo-600 shadow-purple-500/20",
    badge: "text-purple-600 bg-purple-50",
  },
  teal: {
    gradient: "from-teal-600 to-emerald-600 shadow-teal-500/20",
    badge: "text-teal-600 bg-teal-50",
  },
  amber: {
    gradient: "from-amber-500 to-orange-500 shadow-amber-500/20",
    badge: "text-amber-600 bg-amber-50",
  },
  blue: {
    gradient: "from-blue-600 to-indigo-600 shadow-blue-500/20",
    badge: "text-blue-600 bg-blue-50",
  },
  slate: {
    gradient: "from-slate-600 to-slate-700 shadow-slate-500/20",
    badge: "text-slate-600 bg-slate-100",
  },
  indigo: {
    gradient: "from-indigo-600 to-indigo-700 shadow-indigo-500/20",
    badge: "text-indigo-600 bg-indigo-50",
  },
};

export default function PageHeader({ title, subtitle, icon = "LayoutDashboard", accent = "purple", roleLabel, actions }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const accentStyle = accentMap[accent] || accentMap.purple;
  const gradientClass = typeof accentStyle === "string" ? accentStyle : accentStyle.gradient;
  const badgeClass = typeof accentStyle === "string" ? "text-primary bg-primary/10" : accentStyle.badge;
  const displayRole = roleLabel ?? (user?.role ? user.role.toLowerCase().replace(/\s+/g, " ") : "User");

  return (
    <header className="bg-white border-b border-slate-200/80 shadow-sm py-4 mb-6 px-4 md:px-6 rounded-t-3xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className={`p-2.5 bg-gradient-to-br ${gradientClass} rounded-xl shadow-lg shrink-0`}>
            <Icon name={icon} className="text-white w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="flex items-center gap-2 lg:gap-3 w-full md:w-auto justify-end">{actions}</div>}

        {user && (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="cursor-pointer hover:opacity-90 transition-opacity" title={user.name}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} shadow-md flex items-center justify-center text-white font-bold uppercase`}>
                {user.name?.charAt(0) || "U"}
              </div>
            </label>
            <ul tabIndex={0} className="dropdown-content z-50 menu p-3 mt-2 shadow-xl bg-white rounded-2xl w-56 border border-slate-100">
              <li className="menu-title px-3 py-2 border-b border-slate-100 mb-2">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email || `${displayRole}`}</p>
                </div>
              </li>
              <li>
                <button
                  onClick={() => {
                    logout();
                  }}
                  className="text-sm font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <Icon name="LogOut" size={16} />
                  Sign Out
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
