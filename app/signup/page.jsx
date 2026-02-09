"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/constants/roles";

export default function SignupPage() {
    const { signup, isLoading } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState(ROLES.FINANCE_USER); // Default role
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!name || !email || !password) {
            setError("Please fill in all fields");
            return;
        }

        try {
            await signup(name, email, password, role);
        } catch (err) {
            setError(err.message || "Failed to create account");
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#F8F9FC]">
            {/* Dynamic Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200/30 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/30 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md p-8"
            >
                <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-white/50 backdrop-blur-xl bg-white/40">

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                            Create Account
                        </h1>
                        <p className="text-gray-500 mt-2">Join InvoiceFlow today</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-error/10 text-error text-sm p-3 rounded-xl text-center font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-900 ml-1">Full Name</label>
                            <div className="relative">
                                <Icon name="User" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input w-full pl-11 bg-white/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-xl transition-all text-gray-900 placeholder:text-gray-500"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-900 ml-1">Email</label>
                            <div className="relative">
                                <Icon name="Mail" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input w-full pl-11 bg-white/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-xl transition-all text-gray-900 placeholder:text-gray-500"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-900 ml-1">Password</label>
                            <div className="relative">
                                <Icon name="Lock" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input w-full pl-11 bg-white/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-xl transition-all text-gray-900 placeholder:text-gray-500"
                                    placeholder="Create a strong password"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-900 ml-1">Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="select w-full bg-white/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-xl transition-all text-gray-900"
                            >
                                <option value={ROLES.FINANCE_USER} className="text-gray-900 bg-white">Finance User</option>
                                <option value={ROLES.PROJECT_MANAGER} className="text-gray-900 bg-white">Project Manager</option>
                                <option value={ROLES.ADMIN} className="text-gray-900 bg-white">Admin</option>
                                <option value={ROLES.VENDOR} className="text-gray-900 bg-white">Vendor</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full text-white rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all transform hover:scale-[1.02] mt-2"
                        >
                            {isLoading ? <span className="loading loading-spinner loading-sm"></span> : "Sign Up"}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">
                            Already have an account?{" "}
                            <Link href="/login" className="text-primary font-bold hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
