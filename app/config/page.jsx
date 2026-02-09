"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import { toast } from "sonner";
import axios from "axios";

export default function ConfigurationPage() {
    const [settings, setSettings] = useState({
        systemName: "InvoiceFlow",
        maintenanceMode: false,
        emailNotifications: true,
        autoBackup: true,
        sapIntegration: true,
        ringiIntegration: true,
        sharepointIntegration: true,
        smtpIntegration: true,
        matchTolerance: 5,
        ocrEngine: "azure",
        auditRetentionYears: 7
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState({});
    const [testResults, setTestResults] = useState({});

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/api/config");
            if (res.data) {
                setSettings(prev => ({ ...prev, ...res.data }));
            }
        } catch (error) {
            console.error("Failed to fetch configuration", error);
            if (error.response?.status !== 404) {
                toast.error("Failed to load configuration");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await axios.put("/api/config", settings);
            toast.success("Configuration saved successfully");
        } catch (error) {
            console.error("Failed to save configuration", error);
            toast.error(error.response?.data?.error || "Failed to save configuration");
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async (integration) => {
        try {
            setTesting(prev => ({ ...prev, [integration]: true }));
            setTestResults(prev => ({ ...prev, [integration]: null }));

            const res = await axios.post("/api/integrations/test", { integration });

            setTestResults(prev => ({
                ...prev,
                [integration]: {
                    status: res.data.status,
                    message: res.data.message
                }
            }));

            if (res.data.status === 'connected') {
                toast.success(`${integration} connected successfully`);
            } else if (res.data.status === 'not_configured') {
                toast.warning(res.data.message);
            } else {
                toast.error(res.data.message);
            }
        } catch (error) {
            console.error(`Failed to test ${integration}`, error);
            setTestResults(prev => ({
                ...prev,
                [integration]: {
                    status: 'error',
                    message: error.response?.data?.message || "Connection failed"
                }
            }));
            toast.error(`Failed to connect to ${integration}`);
        } finally {
            setTesting(prev => ({ ...prev, [integration]: false }));
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                        System Configuration
                    </h1>
                    <p className="text-gray-500 mt-2">Application settings, integrations, and system preferences</p>
                </div>
            </div>
            <div className="flex justify-end mb-8">
                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Icon name={saving ? "Loader" : "Save"} size={18} className={saving ? "animate-spin" : ""} />
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            {/* General Settings */}
            <section className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Icon name="Settings" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">General Settings</h2>
                </div>

                <div className="space-y-5">
                    <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl">
                        <div>
                            <h3 className="font-semibold text-gray-900">System Name</h3>
                            <p className="text-sm text-gray-500">Display name for the application</p>
                        </div>
                        <input
                            type="text"
                            value={settings.systemName}
                            onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 w-40 text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl">
                        <div>
                            <h3 className="font-semibold text-gray-900">Maintenance Mode</h3>
                            <p className="text-sm text-gray-500">Disable access for non-admin users</p>
                        </div>
                        <button
                            onClick={() => handleToggle('maintenanceMode')}
                            className={`w-12 h-6 rounded-full transition-colors relative ${settings.maintenanceMode ? 'bg-primary' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.maintenanceMode ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl">
                        <div>
                            <h3 className="font-semibold text-gray-900">Email Notifications</h3>
                            <p className="text-sm text-gray-500">Send workflow notifications via email</p>
                        </div>
                        <button
                            onClick={() => handleToggle('emailNotifications')}
                            className={`w-12 h-6 rounded-full transition-colors relative ${settings.emailNotifications ? 'bg-primary' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.emailNotifications ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            </section>

            {/* Matching & OCR Settings */}
            <section className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Icon name="GitMerge" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Matching & OCR</h2>
                </div>

                <div className="space-y-5">
                    <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl">
                        <div>
                            <h3 className="font-semibold text-gray-900">3-Way Match Tolerance</h3>
                            <p className="text-sm text-gray-500">Allowed variance for Invoice + PO + Annexure matching</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">±</span>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={settings.matchTolerance}
                                onChange={(e) => setSettings({ ...settings, matchTolerance: parseInt(e.target.value) })}
                                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 w-20 text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <span className="text-gray-500">%</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl">
                        <div>
                            <h3 className="font-semibold text-gray-900">OCR Engine</h3>
                            <p className="text-sm text-gray-500">Document intelligence provider</p>
                        </div>
                        <select
                            value={settings.ocrEngine}
                            onChange={(e) => setSettings({ ...settings, ocrEngine: e.target.value })}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="azure">Azure Form Recognizer</option>
                            <option value="aws">AWS Textract</option>
                            <option value="google">Google Document AI</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Integrations */}
            <section className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <Icon name="Share2" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Integrations</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* SAP */}
                    <div className="p-6 border border-gray-100 rounded-2xl bg-gradient-to-br from-white to-gray-50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#008FD3]/10 flex items-center justify-center text-[#008FD3]">
                                    <Icon name="Database" size={20} />
                                </div>
                                <span className="font-bold text-gray-800">SAP ERP</span>
                            </div>
                            {testResults['SAP'] ? (
                                <span className={`px-2 py-1 rounded-md text-xs font-medium border ${testResults['SAP'].status === 'connected'
                                        ? 'bg-green-50 text-green-700 border-green-100'
                                        : 'bg-red-50 text-red-700 border-red-100'
                                    }`}>
                                    {testResults['SAP'].status === 'connected' ? 'Connected' : 'Error'}
                                </span>
                            ) : (
                                <span className="px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-medium border border-gray-200">
                                    Unknown
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mb-4">PO retrieval, vendor invoice creation, payment trigger, status sync</p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleTestConnection('SAP')}
                                disabled={testing['SAP']}
                                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                            >
                                {testing['SAP'] && <Icon name="Loader" size={14} className="animate-spin" />}
                                {testing['SAP'] ? 'Testing...' : 'Test Connection'}
                            </button>
                            <span className="text-gray-300">|</span>
                            <button className="text-sm text-gray-500 hover:text-gray-700">Configure</button>
                        </div>
                        {testResults['SAP'] && testResults['SAP'].message && (
                            <p className={`text-xs mt-3 ${testResults['SAP'].status === 'connected' ? 'text-green-600' : 'text-red-500'
                                }`}>
                                {testResults['SAP'].message}
                            </p>
                        )}
                    </div>

                    {/* Ringi Portal */}
                    <div className="p-6 border border-gray-100 rounded-2xl bg-gradient-to-br from-white to-gray-50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Icon name="FileCheck" size={20} />
                                </div>
                                <span className="font-bold text-gray-800">Ringi Portal</span>
                            </div>
                            {testResults['Ringi'] ? (
                                <span className={`px-2 py-1 rounded-md text-xs font-medium border ${testResults['Ringi'].status === 'connected'
                                        ? 'bg-green-50 text-green-700 border-green-100'
                                        : 'bg-red-50 text-red-700 border-red-100'
                                    }`}>
                                    {testResults['Ringi'].status === 'connected' ? 'Connected' : 'Error'}
                                </span>
                            ) : (
                                <span className="px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-medium border border-gray-200">
                                    Unknown
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Annexure retrieval, approval status updates</p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleTestConnection('Ringi')}
                                disabled={testing['Ringi']}
                                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                            >
                                {testing['Ringi'] && <Icon name="Loader" size={14} className="animate-spin" />}
                                {testing['Ringi'] ? 'Testing...' : 'Test Connection'}
                            </button>
                            <span className="text-gray-300">|</span>
                            <button className="text-sm text-gray-500 hover:text-gray-700">Configure</button>
                        </div>
                        {testResults['Ringi'] && testResults['Ringi'].message && (
                            <p className={`text-xs mt-3 ${testResults['Ringi'].status === 'connected' ? 'text-green-600' : 'text-red-500'
                                }`}>
                                {testResults['Ringi'].message}
                            </p>
                        )}
                    </div>

                    {/* SharePoint */}
                    <div className="p-6 border border-gray-100 rounded-2xl bg-gradient-to-br from-white to-gray-50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Icon name="FolderOpen" size={20} />
                                </div>
                                <span className="font-bold text-gray-800">SharePoint</span>
                            </div>
                            {testResults['SharePoint'] ? (
                                <span className={`px-2 py-1 rounded-md text-xs font-medium border ${testResults['SharePoint'].status === 'connected'
                                        ? 'bg-green-50 text-green-700 border-green-100'
                                        : 'bg-red-50 text-red-700 border-red-100'
                                    }`}>
                                    {testResults['SharePoint'].status === 'connected' ? 'Connected' : 'Error'}
                                </span>
                            ) : (
                                <span className="px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-medium border border-gray-200">
                                    Unknown
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Document ingestion, metadata management</p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleTestConnection('SharePoint')}
                                disabled={testing['SharePoint']}
                                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                            >
                                {testing['SharePoint'] && <Icon name="Loader" size={14} className="animate-spin" />}
                                {testing['SharePoint'] ? 'Testing...' : 'Test Connection'}
                            </button>
                            <span className="text-gray-300">|</span>
                            <button className="text-sm text-gray-500 hover:text-gray-700">Configure</button>
                        </div>
                        {testResults['SharePoint'] && testResults['SharePoint'].message && (
                            <p className={`text-xs mt-3 ${testResults['SharePoint'].status === 'connected' ? 'text-green-600' : 'text-red-500'
                                }`}>
                                {testResults['SharePoint'].message}
                            </p>
                        )}
                    </div>

                    {/* SMTP */}
                    <div className="p-6 border border-gray-100 rounded-2xl bg-gradient-to-br from-white to-gray-50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                    <Icon name="Mail" size={20} />
                                </div>
                                <span className="font-bold text-gray-800">SMTP Server</span>
                            </div>
                            {testResults['SMTP'] ? (
                                <span className={`px-2 py-1 rounded-md text-xs font-medium border ${testResults['SMTP'].status === 'connected'
                                        ? 'bg-green-50 text-green-700 border-green-100'
                                        : 'bg-red-50 text-red-700 border-red-100'
                                    }`}>
                                    {testResults['SMTP'].status === 'connected' ? 'Connected' : 'Error'}
                                </span>
                            ) : (
                                <span className="px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-medium border border-gray-200">
                                    Unknown
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Email notifications for workflow approvals</p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleTestConnection('SMTP')}
                                disabled={testing['SMTP']}
                                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                            >
                                {testing['SMTP'] && <Icon name="Loader" size={14} className="animate-spin" />}
                                {testing['SMTP'] ? 'Testing...' : 'Test Connection'}
                            </button>
                            <span className="text-gray-300">|</span>
                            <button className="text-sm text-gray-500 hover:text-gray-700">Configure</button>
                        </div>
                        {testResults['SMTP'] && testResults['SMTP'].message && (
                            <p className={`text-xs mt-3 ${testResults['SMTP'].status === 'connected' ? 'text-green-600' : 'text-red-500'
                                }`}>
                                {testResults['SMTP'].message}
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* Data & Backup */}
            <section className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                        <Icon name="HardDrive" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Data & Backup</h2>
                </div>

                <div className="space-y-5">
                    <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl">
                        <div>
                            <h3 className="font-semibold text-gray-900">Automatic Backup</h3>
                            <p className="text-sm text-gray-500">Daily incremental backups to cloud storage</p>
                        </div>
                        <button
                            onClick={() => handleToggle('autoBackup')}
                            className={`w-12 h-6 rounded-full transition-colors relative ${settings.autoBackup ? 'bg-primary' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.autoBackup ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl">
                        <div>
                            <h3 className="font-semibold text-gray-900">Audit Log Retention</h3>
                            <p className="text-sm text-gray-500">Duration to keep detailed audit trails (SOX/IFRS Compliance)</p>
                        </div>
                        <select
                            value={settings.auditRetentionYears}
                            onChange={(e) => setSettings({ ...settings, auditRetentionYears: parseInt(e.target.value) })}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="5">5 Years</option>
                            <option value="7">7 Years (Recommended)</option>
                            <option value="10">10 Years</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all">
                            <Icon name="RefreshCw" size={18} />
                            Restore from Backup
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl shadow-lg shadow-gray-900/20 hover:bg-gray-800 transition-all">
                            <Icon name="DownloadCloud" size={18} />
                            Trigger Manual Backup
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
