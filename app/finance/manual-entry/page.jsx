'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ManualInvoiceEntryPage = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        vendorName: '',
        vendorEmail: '',
        invoiceNumber: '',
        amount: '',
        currency: 'INR',
        date: new Date().toISOString().split('T')[0],
        description: '',
        poNumber: '',
        project: '',
        assignedPM: '',
        document: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [pms, setPms] = useState([]);
    const [pmsLoading, setPmsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'file' ? files[0] : value
        }));
    };

    // Fetch PMs on component mount
    useEffect(() => {
        const fetchPMs = async () => {
            setPmsLoading(true);
            try {
                const response = await fetch('/api/pms');
                if (!response.ok) {
                    console.error('Failed to fetch PMs');
                    return;
                }
                const data = await response.json();
                setPms(data.pms || []);
            } catch (err) {
                console.error('Error fetching PMs:', err);
            } finally {
                setPmsLoading(false);
            }
        };

        fetchPMs();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        // Validation
        if (!formData.vendorName || !formData.invoiceNumber || !formData.amount || !formData.date) {
            setError('Please fill in all required fields');
            setIsSubmitting(false);
            return;
        }

        if (formData.amount <= 0) {
            setError('Amount must be greater than 0');
            setIsSubmitting(false);
            return;
        }

        try {
            // Create FormData for file upload
            const submitData = new FormData();
            submitData.append('vendorName', formData.vendorName);
            submitData.append('vendorEmail', formData.vendorEmail);
            submitData.append('invoiceNumber', formData.invoiceNumber);
            submitData.append('amount', parseFloat(formData.amount).toFixed(2));
            submitData.append('currency', formData.currency);
            submitData.append('date', formData.date);
            submitData.append('description', formData.description);
            submitData.append('poNumber', formData.poNumber);
            submitData.append('project', formData.project);
            submitData.append('status', 'VERIFIED');
            submitData.append('assignedPM', formData.assignedPM);
            // submitData.append('submittedByUserId', 'manual_finance_entry'); // Removed to allow backend to use session user ID

            if (formData.document) {
                submitData.append('document', formData.document);
            }

            const response = await fetch('/api/invoices', {
                method: 'POST',
                body: submitData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to submit invoice');
            }

            const result = await response.json();
            setSuccess('Invoice submitted successfully!');

            // Reset form
            setFormData({
                vendorName: '',
                vendorEmail: '',
                invoiceNumber: '',
                amount: '',
                currency: 'INR',
                date: new Date().toISOString().split('T')[0],
                description: '',
                poNumber: '',
                project: '',
                assignedPM: '',
                document: null
            });

            // Redirect to finance dashboard after 2 seconds
            setTimeout(() => {
                router.push('/finance/dashboard');
            }, 2000);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/80 to-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Manual Invoice Entry</h1>
                        <p className="text-purple-200 mt-1">Submit invoices manually for processing</p>
                    </div>
                    <Link href="/finance/dashboard">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-2 bg-purple-700/50 text-white rounded-lg hover:bg-purple-600/50 transition-all border border-purple-500/30"
                        >
                            Back to Dashboard
                        </motion.button>
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8"
                >
                    <h2 className="text-2xl font-bold text-white mb-6">Invoice Details</h2>

                    {/* Error/Success Messages */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-white"
                            >
                                {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-white"
                            >
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Vendor Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-purple-200 text-sm font-medium mb-2">
                                    Vendor Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="vendorName"
                                    value={formData.vendorName}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Enter vendor name"
                                />
                            </div>
                            <div>
                                <label className="block text-purple-200 text-sm font-medium mb-2">
                                    Vendor Email
                                </label>
                                <input
                                    type="email"
                                    name="vendorEmail"
                                    value={formData.vendorEmail}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="vendor@example.com"
                                />
                            </div>
                        </div>

                        {/* Invoice Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-purple-200 text-sm font-medium mb-2">
                                    Invoice Number <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="invoiceNumber"
                                    value={formData.invoiceNumber}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="INV-00123"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-purple-200 text-sm font-medium mb-2">
                                        Amount <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        required
                                        min="0.01"
                                        step="0.01"
                                        className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-purple-200 text-sm font-medium mb-2">
                                        Currency
                                    </label>
                                    <input
                                        type="text"
                                        name="currency"
                                        value={formData.currency}
                                        readOnly
                                        className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg text-white focus:outline-none opacity-80 cursor-default"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Date and PO Number */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-purple-200 text-sm font-medium mb-2">
                                    Invoice Date <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-purple-200 text-sm font-medium mb-2">
                                    PO Number (Optional)
                                </label>
                                <input
                                    type="text"
                                    name="poNumber"
                                    value={formData.poNumber}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="PO-001"
                                />
                            </div>
                        </div>

                        {/* Project */}
                        <div>
                            <label className="block text-purple-200 text-sm font-medium mb-2">
                                Project (Optional)
                            </label>
                            <input
                                type="text"
                                name="project"
                                value={formData.project}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Project name or code"
                            />
                        </div>

                        {/* Assigned PM */}
                        <div>
                            <label className="block text-purple-200 text-sm font-medium mb-2">
                                Assigned PM (Optional)
                            </label>
                            <select
                                name="assignedPM"
                                value={formData.assignedPM}
                                onChange={handleChange}
                                disabled={pmsLoading}
                                className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="" className="text-black">Select a Project Manager (Optional)</option>
                                {pms.map(pm => (
                                    <option key={pm.id} value={pm.id} className="text-black">
                                        {pm.name} ({pm.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-purple-200 text-sm font-medium mb-2">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="4"
                                className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                placeholder="Enter invoice description or notes"
                            />
                        </div>

                        {/* Document Upload */}
                        <div>
                            <label className="block text-purple-200 text-sm font-medium mb-2">
                                Invoice Document (Optional)
                            </label>
                            <div className="mt-2">
                                <input
                                    type="file"
                                    name="document"
                                    onChange={handleChange}
                                    accept=".pdf,.doc,.docx,.csv,.xls,.xlsx,.jpg,.jpeg,.png"
                                    className="hidden"
                                    id="document-upload"
                                />
                                <label
                                    htmlFor="document-upload"
                                    className="flex items-center justify-center w-full px-4 py-8 bg-white/5 border-2 border-dashed border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all"
                                >
                                    <div className="text-center">
                                        <svg className="mx-auto h-12 w-12 text-purple-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <p className="mt-2 text-sm text-purple-200">
                                            {formData.document ? formData.document.name : 'Click to upload or drag and drop'}
                                        </p>
                                        <p className="mt-1 text-xs text-purple-300">PDF, Word, Excel, CSV, JPG, PNG (MAX. 10MB)</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex items-center justify-end gap-4">
                            <Link href="/finance/dashboard">
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-6 py-3 bg-purple-700/50 text-white rounded-lg hover:bg-purple-600/50 transition-all border border-purple-500/30"
                                >
                                    Cancel
                                </motion.button>
                            </Link>
                            <motion.button
                                type="submit"
                                disabled={isSubmitting}
                                whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
                                whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
                                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Invoice'}
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default ManualInvoiceEntryPage;