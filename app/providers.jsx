"use client";

import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

export default function Providers({ children }) {
    return (
        <AuthProvider>
            <Toaster richColors position="top-right" />
            {children}
        </AuthProvider>
    );
}
