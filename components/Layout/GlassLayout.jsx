"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Background3D from "@/components/Layout/Background3D";
import Sidebar from "@/components/Layout/Sidebar";
import Navbar from "@/components/Layout/Navbar";

const GlassLayout = ({ children }) => {
  const pathname = usePathname();
  const isPublicPage = ["/login", "/signup", "/"].includes(pathname);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen w-full relative font-sans text-base-content selection:bg-primary/20">
      <Background3D />

      {isPublicPage ? (
        // Public Layout (Full width, no sidebar/navbar)
        <main className="w-full h-screen overflow-auto relative z-10">
          {children}
        </main>
      ) : (
        // App layout (same for dashboard, approvals, vendors, etc.): sidebar + main content
        <div className="flex w-full h-screen overflow-hidden">
          <Sidebar
            mobileOpen={isMobileSidebarOpen}
            setMobileOpen={setIsMobileSidebarOpen}
          />
          <main className="flex-1 flex flex-col h-full overflow-hidden relative">
            <div className="pt-6 px-6 pb-0">
              <div className="glass-panel rounded-t-3xl h-[calc(100dvh-1.5rem)] flex flex-col backdrop-blur-lg border-b-0">
                <Navbar
                  onMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                />
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar scroll-smooth">
                  {children}
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default GlassLayout;