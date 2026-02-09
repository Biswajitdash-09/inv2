"use client";

import Icon from "@/components/Icon";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canSeeMenuItem } from "@/constants/roles";

const Navbar = ({ onMenuClick }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const isVendorPage = pathname === "/vendors";

  // Vendor section: no InvoiceFlow / VENDOR HUB / logo in navbar; page content has its own header
  if (isVendorPage && user) {
    return (
      <header className="navbar w-full p-0 min-h-[4rem] relative z-50">
        <div className="flex-1" />
      </header>
    );
  }

  return (
    <header className="navbar w-full p-0 min-h-[4rem] relative z-50">
      <div className="flex-1 lg:hidden">
        <button
          className="btn btn-ghost lg:hidden"
          onClick={onMenuClick}
        >
          <Icon name="Menu" size={24} />
        </button>
        <Link href="/" className="btn btn-ghost text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">InvoiceFlow</Link>
      </div>
      <div className="flex-1 hidden lg:flex px-4" />
    </header>
  );
};

export default Navbar;