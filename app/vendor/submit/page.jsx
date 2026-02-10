'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VendorSubmitPage() {
    const [projects, setProjects] = useState([]);
    const [pms, setPMs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const invoiceRef = useRef(null);
    const timesheetRef = useRef(null);
    const rfpRef = useRef(null);

    const [formData, setFormData] = useState({
        invoiceFile: null,
        timesheetFile: null,
        annexFile: null,
        invoiceNumber: '',
        invoiceDate: '',
        amount: '',
        billingMonth: '',
        project: '',
        assignedPM: '',
        notes: ''
    });

    useEffect(() => {
        // Fetch available projects and PMs
        fetchProjects();
        fetchPMs();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            if (res.ok) setProjects(data.projects || []);
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    };

    const fetchPMs = async () => {
        try {
            const res = await fetch('/api/pms');
            const data = await res.json();
            if (res.ok) setPMs(data.pms || []);
        } catch (err) {
            console.error('Error fetching PMs:', err);
        }
    };

    const handleFileChange = (field, e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, [field]: file });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.invoiceFile) {
            setError('Please select an invoice file');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const submitData = new FormData();
            submitData.append('invoice', formData.invoiceFile);
            if (formData.timesheetFile) submitData.append('timesheet', formData.timesheetFile);
            if (formData.annexFile) submitData.append('annex', formData.annexFile);
            submitData.append('invoiceNumber', formData.invoiceNumber);
            submitData.append('invoiceDate', formData.invoiceDate);
            submitData.append('amount', formData.amount);
            submitData.append('billingMonth', formData.billingMonth);
            submitData.append('project', formData.project);
            submitData.append('assignedPM', formData.assignedPM);
            submitData.append('notes', formData.notes);

            const res = await fetch('/api/vendor/submit', {
                method: 'POST',
                body: submitData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccess(`Invoice submitted successfully! ${data.documentsAttached > 0 ? `${data.documentsAttached} document(s) attached.` : ''}`);

            // Reset form
            setFormData({
                invoiceFile: null,
                timesheetFile: null,
                annexFile: null,
                invoiceNumber: '',
                invoiceDate: '',
                amount: '',
                billingMonth: '',
                project: '',
                assignedPM: '',
                notes: ''
            });
            if (invoiceRef.current) invoiceRef.current.value = '';
            if (timesheetRef.current) timesheetRef.current.value = '';
            if (rfpRef.current) rfpRef.current.value = '';
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 text-center"
                >
                    <h1 className="text-3xl font-bold text-white mb-2">Submit Invoice</h1>
                    <p className="text-gray-400">Upload your invoice and supporting documents</p>
                </motion.div>

                {/* Messages */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-6"
                        >
                            {error}
                            <button onClick={() => setError(null)} className="float-right">×</button>
                        </motion.div>
                    )}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg mb-6"
                        >
                            {success}
                            <button onClick={() => setSuccess(null)} className="float-right">×</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Submission Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/10"
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Invoice File (Required) */}
                        <div className="bg-purple-500/10 rounded-xl p-6 border-2 border-dashed border-purple-500/30">
                            <label className="block text-lg font-medium text-white mb-3">
                                Invoice Document <span className="text-red-400">*</span>
                            </label>
                            <input
                                ref={invoiceRef}
                                type="file"
                                onChange={(e) => handleFileChange('invoiceFile', e)}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer hover:file:bg-purple-700"
                            />
                            {formData.invoiceFile && (
                                <p className="mt-2 text-sm text-green-400">
                                    ✓ {formData.invoiceFile.name}
                                </p>
                            )}
                        </div>

                        {/* Invoice Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Invoice Number</label>
                                <input
                                    type="text"
                                    value={formData.invoiceNumber}
                                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                    placeholder="INV-001"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Invoice Date</label>
                                <input
                                    type="date"
                                    value={formData.invoiceDate}
                                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Amount (₹)</label>
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="0.00"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Billing Month</label>
                                <input
                                    type="month"
                                    value={formData.billingMonth}
                                    onChange={(e) => setFormData({ ...formData, billingMonth: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        {/* PM Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Assign to Project Manager</label>
                                <select
                                    value={formData.assignedPM}
                                    onChange={(e) => setFormData({ ...formData, assignedPM: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Select PM (Optional)</option>
                                    {pms.map(pm => (
                                        <option key={pm.id} value={pm.id}>{pm.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Project</label>
                                <select
                                    value={formData.project}
                                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Select Project (Optional)</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Supporting Documents */}
                        <div className="border-t border-white/10 pt-6">
                            <h3 className="text-lg font-medium text-white mb-4">Supporting Documents (Optional)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Timesheet</label>
                                    <input
                                        ref={timesheetRef}
                                        type="file"
                                        onChange={(e) => handleFileChange('timesheetFile', e)}
                                        accept=".pdf,.xlsx,.xls"
                                        className="w-full text-sm text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-green-600/50 file:text-green-200 file:cursor-pointer"
                                    />
                                    {formData.timesheetFile && (
                                        <p className="mt-1 text-xs text-green-400">✓ {formData.timesheetFile.name}</p>
                                    )}
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Annex</label>
                                    <input
                                        ref={rfpRef}
                                        type="file"
                                        onChange={(e) => handleFileChange('annexFile', e)}
                                        accept=".pdf,.doc,.docx,.xlsx,.xls"
                                        className="w-full text-sm text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600/50 file:text-blue-200 file:cursor-pointer"
                                    />
                                    {formData.annexFile && (
                                        <p className="mt-1 text-xs text-blue-400">✓ {formData.annexFile.name}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Additional Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={2}
                                placeholder="Any additional information..."
                                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !formData.invoiceFile}
                            className="w-full py-4 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span> Submitting...
                                </span>
                            ) : (
                                '📤 Submit Invoice'
                            )}
                        </button>
                    </form>
                </motion.div >
            </div >
        </div >
    );
}
