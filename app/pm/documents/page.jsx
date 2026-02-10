'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/Layout/PageHeader';
import Card from '@/components/ui/Card';
import Icon from '@/components/Icon';

const DOCUMENT_TYPES = [
    { value: 'RINGI', label: 'Ringi', description: 'PDF format', color: 'purple' },
    { value: 'ANNEX', label: 'Annex', description: 'PDF, Word, or Excel', color: 'blue' },
    { value: 'TIMESHEET', label: 'Timesheet', description: 'Excel/PDF - validated at upload', color: 'green' }
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

    const getTypeClasses = (type) => {
        switch (type) {
            case 'RINGI': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'ANNEX': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'TIMESHEET': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            default: return 'bg-slate-50 text-slate-500 border-slate-100';
        }
    };

    const getStatusClasses = (status) => {
        switch (status) {
            case 'VALIDATED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'REJECTED': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-amber-50 text-amber-600 border-amber-100';
        }
    };

    return (
        <div className="pb-10">
            <PageHeader
                title="Document Management"
                subtitle="Upload and manage project documents (Ringi, Annex, Timesheet)"
                icon="FileText"
                accent="purple"
            />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Filters & Actions */}
                <Card className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full sm:w-48 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                            >
                                <option value="">All Types</option>
                                {DOCUMENT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            <select
                                value={filterProject}
                                onChange={(e) => setFilterProject(e.target.value)}
                                className="w-full sm:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                            >
                                <option value="">All Projects</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="w-full sm:w-auto px-8 py-3 bg-linear-to-br from-purple-600 to-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Icon name="Plus" size={16} /> Upload Document
                        </button>
                    </div>
                </Card>

                {/* Messages */}
                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex justify-between items-center"
                        >
                            <span className="font-medium">{error}</span>
                            <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded-lg">✕</button>
                        </motion.div>
                    )}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-xl flex justify-between items-center"
                        >
                            <span className="font-medium">{success}</span>
                            <button onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-100 rounded-lg">✕</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Documents Grid */}
                {loading ? (
                    <div className="text-center py-20">
                        <span className="loading loading-spinner loading-lg text-primary"></span>
                        <p className="mt-4 text-slate-500 font-medium">Loading documents...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {documents.map((doc, idx) => (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card className="h-full hover:shadow-md transition-all border-slate-200/60 p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                                <Icon name="File" className="text-slate-400" size={24} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-slate-800 truncate" title={doc.fileName}>
                                                    {doc.fileName}
                                                </h3>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                                                    {(doc.fileSize / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border shrink-0 ${getTypeClasses(doc.type)}`}>
                                            {doc.type.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        {doc.metadata?.projectName && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project</span>
                                                <span className="text-xs font-bold text-slate-700 truncate ml-4 text-right">{doc.metadata.projectName}</span>
                                            </div>
                                        )}
                                        {doc.metadata?.billingMonth && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Month</span>
                                                <span className="text-xs font-bold text-slate-700">{doc.metadata.billingMonth}</span>
                                            </div>
                                        )}
                                        {doc.metadata?.ringiNumber && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ringi #</span>
                                                <span className="text-xs font-bold text-slate-700">{doc.metadata.ringiNumber}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${getStatusClasses(doc.status)}`}>
                                            {doc.status}
                                        </span>
                                        <a
                                            href={doc.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-black text-[10px] uppercase tracking-widest transition-colors"
                                        >
                                            View <Icon name="ArrowRight" size={12} />
                                        </a>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {!loading && documents.length === 0 && (
                    <Card className="text-center py-20">
                        <div className="max-w-xs mx-auto">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <Icon name="Inbox" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">No documents found</h3>
                            <p className="text-slate-500 mt-1">Start by uploading your first project document.</p>
                        </div>
                    </Card>
                )}

                {/* Upload Modal */}
                <AnimatePresence>
                    {showUploadModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-100 p-4">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar"
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-1">Upload Center</p>
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Add New Document</h2>
                                    </div>
                                    <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                        <Icon name="X" size={20} className="text-slate-400" />
                                    </button>
                                </div>

                                <form onSubmit={handleUpload} className="space-y-8">
                                    {error && (
                                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold flex justify-between items-center">
                                            <span>{error}</span>
                                            <button type="button" onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded-lg">✕</button>
                                        </div>
                                    )}

                                    {/* Document Type Selection */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Select Document Category</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {DOCUMENT_TYPES.map(t => (
                                                <button
                                                    key={t.value}
                                                    type="button"
                                                    onClick={() => setUploadData({ ...uploadData, type: t.value })}
                                                    className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 group ${uploadData.type === t.value
                                                        ? 'border-purple-600 bg-purple-50'
                                                        : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200'
                                                        }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${uploadData.type === t.value ? 'bg-purple-600 text-white' : 'bg-white text-slate-400 group-hover:bg-slate-100'}`}>
                                                        <Icon name="File" size={16} />
                                                    </div>
                                                    <div>
                                                        <div className={`text-[10px] font-black uppercase tracking-wider ${uploadData.type === t.value ? 'text-purple-700' : 'text-slate-700'}`}>{t.label}</div>
                                                        <div className="text-[8px] font-bold text-slate-400 uppercase leading-tight mt-1">{t.description}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* File Input Area */}
                                    <div className="relative">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Attachment</label>
                                        <div className="group relative border-2 border-dashed border-slate-200 rounded-2xl p-8 transition-all hover:bg-slate-50 hover:border-purple-300 flex flex-col items-center justify-center gap-3 cursor-pointer">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                onChange={handleFileChange}
                                                accept=".pdf,.xlsx,.xls,.doc,.docx"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                                <Icon name="Upload" size={24} />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-slate-700">{uploadData.file ? uploadData.file.name : 'Click or drop to upload'}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PDF, Excel, or Word (Max 10MB)</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Project & Details Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Associated Project</label>
                                            <select
                                                required
                                                value={uploadData.projectId}
                                                onChange={(e) => setUploadData({ ...uploadData, projectId: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-bold text-sm"
                                            >
                                                <option value="">Select Project</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Billing cycle (Month)</label>
                                            <input
                                                type="month"
                                                value={uploadData.billingMonth}
                                                onChange={(e) => setUploadData({ ...uploadData, billingMonth: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-bold text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Type-specific Fields */}
                                    {uploadData.type === 'RINGI' && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Ringi Control Number</label>
                                            <input
                                                type="text"
                                                value={uploadData.ringiNumber}
                                                onChange={(e) => setUploadData({ ...uploadData, ringiNumber: e.target.value })}
                                                placeholder="e.g. RINGI/2026/042"
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-bold text-sm"
                                            />
                                        </motion.div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => setShowUploadModal(false)}
                                            disabled={uploading}
                                            className="order-2 sm:order-1 flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                                        >
                                            Cancel Action
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!uploadData.file || uploading}
                                            className="order-1 sm:order-2 flex-1 px-6 py-4 bg-linear-to-br from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {uploading ? (
                                                <><span className="loading loading-spinner loading-xs"></span> Finalizing...</>
                                            ) : (
                                                'Process Upload'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
