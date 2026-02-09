'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DOCUMENT_TYPES = [
    { value: 'RINGI', label: 'Ringi', description: 'PDF format', color: 'purple' },
    { value: 'RFP_COMMERCIAL', label: 'RFP Commercial', description: 'PDF, Word, or Excel', color: 'blue' },
    { value: 'TIMESHEET', label: 'Timesheet', description: 'Excel/PDF - validated', color: 'green' },
    { value: 'RATE_CARD', label: 'Rate Card', description: 'Excel/PDF - validated', color: 'amber' }
];

export default function PMDocumentsPage() {
    const [documents, setDocuments] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [filterType, setFilterType] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const fileInputRef = useRef(null);

    const [uploadData, setUploadData] = useState({
        file: null,
        type: 'RINGI',
        projectId: '',
        projectName: '',
        billingMonth: '',
        ringiNumber: '',
        description: ''
    });
    const [validationResult, setValidationResult] = useState(null);

    useEffect(() => {
        fetchDocuments();
        fetchProjects();
    }, [filterType, filterProject]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterType) params.append('type', filterType);
            if (filterProject) params.append('projectId', filterProject);

            const res = await fetch(`/api/pm/documents?${params}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setDocuments(data.documents || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/pm/projects');
            const data = await res.json();
            if (res.ok) setProjects(data.projects || []);
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadData({ ...uploadData, file });
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadData.file || !uploadData.type) return;

        try {
            setUploading(true);
            setError(null);
            setValidationResult(null);

            const formData = new FormData();
            formData.append('file', uploadData.file);
            formData.append('type', uploadData.type);
            if (uploadData.projectId) formData.append('projectId', uploadData.projectId);
            if (uploadData.projectName) formData.append('projectName', uploadData.projectName);
            if (uploadData.billingMonth) formData.append('billingMonth', uploadData.billingMonth);
            if (uploadData.ringiNumber) formData.append('ringiNumber', uploadData.ringiNumber);
            if (uploadData.description) formData.append('description', uploadData.description);

            const res = await fetch('/api/pm/documents', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Show validation result
            if (data.validation) {
                setValidationResult(data.validation);
            }

            setSuccess(data.validation?.isValid
                ? 'Document uploaded and validated successfully!'
                : 'Document uploaded - pending review');
            setShowUploadModal(false);
            setUploadData({
                file: null,
                type: 'RINGI',
                projectId: '',
                projectName: '',
                billingMonth: '',
                ringiNumber: '',
                description: ''
            });
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchDocuments();
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'RINGI': return 'bg-purple-500/20 text-purple-300';
            case 'RFP_COMMERCIAL': return 'bg-blue-500/20 text-blue-300';
            case 'TIMESHEET': return 'bg-green-500/20 text-green-300';
            case 'RATE_CARD': return 'bg-amber-500/20 text-amber-300';
            default: return 'bg-gray-500/20 text-gray-300';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'VALIDATED': return 'bg-emerald-500/20 text-emerald-300';
            case 'REJECTED': return 'bg-red-500/20 text-red-300';
            default: return 'bg-yellow-500/20 text-yellow-300';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-white mb-2">Document Management</h1>
                    <p className="text-gray-400">Upload and manage project documents (Ringi, Annex, Timesheet)</p>
                </motion.div>

                {/* Filters & Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/10"
                >
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex flex-wrap gap-4">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">All Types</option>
                                {DOCUMENT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            <select
                                value={filterProject}
                                onChange={(e) => setFilterProject(e.target.value)}
                                className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">All Projects</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/25"
                        >
                            + Upload Document
                        </button>
                    </div>
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

                {/* Documents Grid */}
                {loading ? (
                    <div className="text-center text-gray-400 py-12">Loading documents...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {documents.map((doc, idx) => (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">📄</span>
                                        <div>
                                            <h3 className="text-white font-medium truncate max-w-[180px]" title={doc.fileName}>
                                                {doc.fileName}
                                            </h3>
                                            <p className="text-xs text-gray-400">
                                                {(doc.fileSize / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(doc.type)}`}>
                                        {doc.type}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm mb-4">
                                    {doc.metadata?.projectName && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Project:</span>
                                            <span className="text-white">{doc.metadata.projectName}</span>
                                        </div>
                                    )}
                                    {doc.metadata?.billingMonth && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Billing Month:</span>
                                            <span className="text-white">{doc.metadata.billingMonth}</span>
                                        </div>
                                    )}
                                    {doc.metadata?.ringiNumber && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Ringi #:</span>
                                            <span className="text-white">{doc.metadata.ringiNumber}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(doc.status)}`}>
                                        {doc.status}
                                    </span>
                                    <a
                                        href={doc.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-400 hover:text-purple-300 text-sm"
                                    >
                                        View →
                                    </a>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {!loading && documents.length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                        No documents found. Click "Upload Document" to add one.
                    </div>
                )}

                {/* Upload Modal */}
                <AnimatePresence>
                    {showUploadModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowUploadModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-800/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-lg border border-white/20"
                            >
                                <h2 className="text-2xl font-bold text-white mb-6">Upload Document</h2>
                                <form onSubmit={handleUpload} className="space-y-4">
                                    {/* Document Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Document Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {DOCUMENT_TYPES.map(t => (
                                                <button
                                                    key={t.value}
                                                    type="button"
                                                    onClick={() => setUploadData({ ...uploadData, type: t.value })}
                                                    className={`p-3 rounded-lg border text-center transition-all ${uploadData.type === t.value
                                                        ? 'border-purple-500 bg-purple-500/20 text-white'
                                                        : 'border-white/20 text-gray-400 hover:border-white/40'
                                                        }`}
                                                >
                                                    <div className="font-medium">{t.label}</div>
                                                    <div className="text-xs opacity-70">{t.description}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* File Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Select File</label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            onChange={handleFileChange}
                                            accept=".pdf,.xlsx,.xls,.doc,.docx"
                                            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer"
                                        />
                                    </div>

                                    {/* Project */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Project</label>
                                            <select
                                                value={uploadData.projectId}
                                                onChange={(e) => setUploadData({ ...uploadData, projectId: e.target.value })}
                                                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            >
                                                <option value="">Select Project</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Billing Month</label>
                                            <input
                                                type="month"
                                                value={uploadData.billingMonth}
                                                onChange={(e) => setUploadData({ ...uploadData, billingMonth: e.target.value })}
                                                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Ringi Number */}
                                    {uploadData.type === 'RINGI' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Ringi Number</label>
                                            <input
                                                type="text"
                                                value={uploadData.ringiNumber}
                                                onChange={(e) => setUploadData({ ...uploadData, ringiNumber: e.target.value })}
                                                placeholder="Enter Ringi Number"
                                                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowUploadModal(false)}
                                            disabled={uploading}
                                            className="flex-1 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!uploadData.file || uploading}
                                            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
                                        >
                                            {uploading ? 'Uploading...' : 'Upload'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
