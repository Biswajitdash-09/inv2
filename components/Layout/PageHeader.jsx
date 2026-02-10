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
  const displayRole = roleLabel ?? (user?.role ? (user.role === 'PM' || user.role === 'Project Manager' ? 'Project Manager' : user.role) : "User");

  return (
    <header className="border-b border-slate-200/80 shadow-sm py-4 mb-8 px-4 md:px-6 rounded-t-3xl sticky top-0 z-40 backdrop-blur-md bg-white/90">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:flex-1 min-w-0">
          <div className={`p-3 bg-linear-to-br ${gradientClass} rounded-2xl shadow-lg shrink-0 border-2 border-white/20`}>
            <Icon name={icon} className="text-white w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight truncate leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {actions && <div className="flex items-center gap-2 lg:gap-3">{actions}</div>}

          {user && (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="group cursor-pointer flex items-center gap-3 pl-3 pr-1 py-1 bg-slate-50 border border-slate-200 rounded-2xl transition-all hover:bg-slate-100 active:scale-95">
                <div className="hidden sm:block text-right pr-1">
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-none">{user.name}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">{displayRole}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${gradientClass} shadow-md flex items-center justify-center text-white font-black text-xs uppercase border-2 border-white`}>
                  {user.name?.charAt(0) || "U"}
                </div>
              </label>
              <ul tabIndex={0} className="dropdown-content z-60 menu p-3 mt-4 shadow-2xl bg-white rounded-3xl w-64 border border-slate-100">
                <li className="px-3 py-4 border-b border-slate-50 mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-linear-to-br ${gradientClass} flex items-center justify-center text-white font-black text-sm uppercase shadow-lg shadow-slate-200`}>
                      {user.name?.charAt(0) || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-800 text-sm tracking-tight truncate">{user.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{user.email || displayRole}</p>
                    </div>
                  </div>
                </li>
                <li>
                  <button
                    onClick={() => {
                      logout();
                      router.push('/login');
                    }}
                    className="text-xs font-black text-rose-600 hover:bg-rose-50 flex items-center gap-3 p-3 rounded-2xl uppercase tracking-widest mt-1"
                  >
                    <Icon name="LogOut" size={16} />
                    Sign Out
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
