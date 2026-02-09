"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
    const { login, isLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }
        if (!isValidEmail(email)) {
            setError("Please enter a valid email address");
            return;
        }

        try {
            await login(email.trim(), password);
        } catch (err) {
            setError(err.message || "Login failed. Please try again.");
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#F8F9FC]">
            {/* Dynamic Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200/30 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/30 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md p-8"
            >
                <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-white/50 backdrop-blur-xl bg-white/40">

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent mb-4 shadow-lg shadow-primary/30">
                            <Icon name="Zap" className="text-white" size={32} />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                            Welcome Back
                        </h1>
                        <p className="text-gray-500 mt-2">Sign in to InvoiceFlow</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-error/10 text-error text-sm p-3 rounded-xl text-center font-medium space-y-2">
                                <p>{error}</p>
                                {error === "No account found with this email address" && (
                                    <p className="text-gray-600">
                                        <Link href="/signup" className="text-primary font-bold hover:underline">
                                            Create an account
                                        </Link>{" "}
                                        to get started.
                                    </p>
                                )}
                            </div>
                        )}

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
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>


                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full text-white rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all transform hover:scale-[1.02]"
                        >
                            {isLoading ? <span className="loading loading-spinner loading-sm"></span> : "Sign In"}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">
                            Don't have an account?{" "}
                            <Link href="/signup" className="text-primary font-bold hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
