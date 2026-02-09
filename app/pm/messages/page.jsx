'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MESSAGE_TYPES = [
    { value: 'GENERAL', label: 'General', color: 'gray' },
    { value: 'INFO_REQUEST', label: 'Info Request', color: 'blue' },
    { value: 'CLARIFICATION', label: 'Clarification', color: 'yellow' },
    { value: 'DOCUMENT_REQUEST', label: 'Document Request', color: 'purple' }
];

export default function PMMessagesPage() {
    const [messages, setMessages] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeTab, setActiveTab] = useState('inbox');
    const [showComposeModal, setShowComposeModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);

    const [composeData, setComposeData] = useState({
        recipientId: '',
        subject: '',
        content: '',
        messageType: 'GENERAL',
        invoiceId: ''
    });

    useEffect(() => {
        fetchMessages();
        fetchVendors();
    }, [activeTab]);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/pm/messages?type=${activeTab}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessages(data.messages || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async () => {
        try {
            const res = await fetch('/api/vendors');
            const data = await res.json();
            if (res.ok) setVendors(data.vendors || []);
        } catch (err) {
            console.error('Error fetching vendors:', err);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/pm/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(composeData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setShowComposeModal(false);
            setComposeData({ recipientId: '', subject: '', content: '', messageType: 'GENERAL', invoiceId: '' });
            fetchMessages();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleMarkAsRead = async (messageId) => {
        try {
            await fetch('/api/pm/messages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: [messageId] })
            });
            fetchMessages();
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'INFO_REQUEST': return 'bg-blue-500/20 text-blue-300';
            case 'CLARIFICATION': return 'bg-yellow-500/20 text-yellow-300';
            case 'DOCUMENT_REQUEST': return 'bg-purple-500/20 text-purple-300';
            case 'APPROVAL_NOTIFICATION': return 'bg-green-500/20 text-green-300';
            default: return 'bg-gray-500/20 text-gray-300';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex justify-between items-center"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Messages</h1>
                        <p className="text-gray-400">Communicate with vendors about invoices</p>
                    </div>
                    <button
                        onClick={() => setShowComposeModal(true)}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                    >
                        ✉️ Compose
                    </button>
                </motion.div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('inbox')}
                        className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'inbox'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/10 text-gray-400 hover:text-white'
                            }`}
                    >
                        Inbox {unreadCount > 0 && <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{unreadCount}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('sent')}
                        className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'sent'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/10 text-gray-400 hover:text-white'
                            }`}
                    >
                        Sent
                    </button>
                </div>

                {/* Error Display */}
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
                </AnimatePresence>

                {/* Messages List */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
                >
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">Loading messages...</div>
                    ) : (
                        <div className="divide-y divide-white/10">
                            {messages.map((message, idx) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    onClick={() => {
                                        setSelectedMessage(message);
                                        if (!message.isRead && activeTab === 'inbox') {
                                            handleMarkAsRead(message.id);
                                        }
                                    }}
                                    className={`p-4 hover:bg-white/5 cursor-pointer transition-colors ${!message.isRead && activeTab === 'inbox' ? 'bg-purple-500/5' : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                {!message.isRead && activeTab === 'inbox' && (
                                                    <span className="w-2 h-2 bg-purple-500 rounded-full" />
                                                )}
                                                <span className="text-white font-medium">
                                                    {activeTab === 'inbox' ? message.senderName : message.recipientName}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${getTypeColor(message.messageType)}`}>
                                                    {message.messageType.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <p className="text-gray-300 font-medium">{message.subject || '(no subject)'}</p>
                                            <p className="text-gray-500 text-sm truncate">{message.content}</p>
                                        </div>
                                        <span className="text-gray-500 text-xs">
                                            {new Date(message.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                    {!loading && messages.length === 0 && (
                        <div className="p-12 text-center text-gray-400">
                            No messages in {activeTab}
                        </div>
                    )}
                </motion.div>

                {/* Compose Modal */}
                <AnimatePresence>
                    {showComposeModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowComposeModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-800/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-lg border border-white/20"
                            >
                                <h2 className="text-2xl font-bold text-white mb-6">Compose Message</h2>
                                <form onSubmit={handleSendMessage} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">To (Vendor)</label>
                                        <select
                                            value={composeData.recipientId}
                                            onChange={(e) => setComposeData({ ...composeData, recipientId: e.target.value })}
                                            required
                                            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="">Select Vendor</option>
                                            {vendors.map(v => (
                                                <option key={v.id} value={v.linkedUserId || v.id}>{v.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Message Type</label>
                                        <select
                                            value={composeData.messageType}
                                            onChange={(e) => setComposeData({ ...composeData, messageType: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {MESSAGE_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
                                        <input
                                            type="text"
                                            value={composeData.subject}
                                            onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                                            placeholder="Subject..."
                                            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                                        <textarea
                                            value={composeData.content}
                                            onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                                            rows={4}
                                            required
                                            placeholder="Type your message..."
                                            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowComposeModal(false)}
                                            className="flex-1 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                                        >
                                            Send Message
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Message Detail Modal */}
                <AnimatePresence>
                    {selectedMessage && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setSelectedMessage(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-800/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-lg border border-white/20"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(selectedMessage.messageType)}`}>
                                            {selectedMessage.messageType.replace('_', ' ')}
                                        </span>
                                        <h2 className="text-xl font-bold text-white mt-2">
                                            {selectedMessage.subject || '(no subject)'}
                                        </h2>
                                    </div>
                                    <button onClick={() => setSelectedMessage(null)} className="text-gray-400 hover:text-white">✕</button>
                                </div>
                                <div className="flex justify-between text-sm text-gray-400 mb-4">
                                    <span>From: {selectedMessage.senderName}</span>
                                    <span>{new Date(selectedMessage.created_at).toLocaleString()}</span>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-gray-300 whitespace-pre-wrap">
                                    {selectedMessage.content}
                                </div>
                                {selectedMessage.invoiceId && (
                                    <div className="mt-4 text-sm">
                                        <span className="text-gray-400">Related Invoice: </span>
                                        <a href={`/approvals/${selectedMessage.invoiceId}`} className="text-purple-400 hover:underline">
                                            View Invoice
                                        </a>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
