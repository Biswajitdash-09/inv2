'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROLES, ROLES_LIST } from '@/constants/roles';

// Role colors and labels
const ROLE_CONFIG = {
    [ROLES.ADMIN]: { color: 'purple', bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40', icon: '👑' },
    [ROLES.FINANCE_USER]: { color: 'green', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', icon: '💰' },
    [ROLES.PROJECT_MANAGER]: { color: 'blue', bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40', icon: '📋' },
    [ROLES.VENDOR]: { color: 'orange', bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40', icon: '🏪' },
};

const PARENT_ROLE_MAP = {
    [ROLES.FINANCE_USER]: ROLES.ADMIN,
    [ROLES.PROJECT_MANAGER]: ROLES.FINANCE_USER,
    [ROLES.VENDOR]: ROLES.PROJECT_MANAGER
};

// What children a role can have
const CHILD_ROLE_MAP = {
    [ROLES.ADMIN]: [ROLES.FINANCE_USER],
    [ROLES.FINANCE_USER]: [ROLES.PROJECT_MANAGER],
    [ROLES.PROJECT_MANAGER]: [ROLES.VENDOR],
};

// Recursive Tree Node component
function TreeNode({ node, depth = 0, onOpenAssign, onUnassign }) {
    const [expanded, setExpanded] = useState(true);
    const config = ROLE_CONFIG[node.role] || { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/40', icon: '👤' };
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className={`${depth > 0 ? 'ml-8' : ''}`}>
            {depth > 0 && (
                <div className="relative">
                    <div className="absolute -left-6 top-0 h-full w-px bg-white/10" />
                    <div className="absolute -left-6 top-5 w-6 h-px bg-white/10" />
                </div>
            )}

            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: depth * 0.05 }}
                className={`relative flex items-center gap-3 p-3 rounded-xl ${config.bg} border ${config.border} mb-2 group hover:scale-[1.01] transition-transform`}
            >
                {hasChildren && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                    >
                        {expanded ? '−' : '+'}
                    </button>
                )}
                {!hasChildren && <div className="w-6 h-6 flex items-center justify-center text-lg">{config.icon}</div>}

                <div className="flex-1 min-w-0">
                    <div className={`font-medium ${config.text} truncate`}>{node.name}</div>
                    <div className="text-xs text-gray-400 truncate">{node.email}</div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
                    {node.role}
                </span>

                <span className={`w-2 h-2 rounded-full ${node.isActive !== false ? 'bg-emerald-400' : 'bg-red-400'}`} />

                {/* Action buttons (always visible now) */}
                <div className="flex items-center gap-1">
                    {/* Add Subordinate Button (if allowed by role) */}
                    {CHILD_ROLE_MAP[node.role] && (
                        <button
                            onClick={() => onOpenAssign(node)}
                            className="p-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition-all"
                            title={`Add ${CHILD_ROLE_MAP[node.role].join('/')}`}
                        >
                            ➕
                        </button>
                    )}

                    {/* Manage button for all non-admin users */}
                    {node.role !== ROLES.ADMIN && (
                        <button
                            onClick={() => onOpenAssign(node)}
                            className="p-1.5 text-xs text-purple-300 hover:text-purple-200 hover:bg-purple-500/20 rounded-lg transition-all"
                            title="Manage this node"
                        >
                            ⚙️
                        </button>
                    )}

                    {node.role !== ROLES.ADMIN && node.managedBy && (
                        <button
                            onClick={() => onUnassign(node.id)}
                            className="p-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                            title="Remove from manager"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {expanded && hasChildren && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {node.children.map(child => (
                            <TreeNode
                                key={child.id}
                                node={child}
                                depth={depth + 1}
                                onOpenAssign={onOpenAssign}
                                onUnassign={onUnassign}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function HierarchyPage() {
    const [tree, setTree] = useState([]);
    const [unassigned, setUnassigned] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Advanced assignment modal
    const [assignModal, setAssignModal] = useState(null); // full user node
    const [selectedParent, setSelectedParent] = useState('');
    const [selectedChildren, setSelectedChildren] = useState([]); // array of child IDs

    const fetchHierarchy = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/hierarchy', { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch');
            setTree(data.tree || []);
            setUnassigned(data.unassigned || []);
            setAllUsers(data.allUsers || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchHierarchy(); }, [fetchHierarchy]);

    // Open the advanced assign modal for a user
    const openAssignModal = (node) => {
        setSelectedParent(node.managedBy || '');
        // Find current children (users whose managedBy === node.id)
        const currentChildren = allUsers.filter(u => u.managedBy === node.id).map(u => u.id);
        setSelectedChildren(currentChildren);
        setAssignModal(node);
    };

    const handleSaveAssignment = async () => {
        if (!assignModal) return;

        try {
            const body = {
                userId: assignModal.id,
                managedBy: selectedParent || null,
                children: selectedChildren
            };

            const res = await fetch('/api/admin/hierarchy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');

            setSuccess(`Hierarchy updated successfully for ${assignModal.name}.`);
            setAssignModal(null);
            setSelectedParent('');
            setSelectedChildren([]);
            fetchHierarchy();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleUnassign = async (userId) => {
        try {
            const res = await fetch('/api/admin/hierarchy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, managedBy: null })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to unassign');
            setSuccess('User unassigned from manager.');
            fetchHierarchy();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    // Get valid parent options for a given role
    const getValidParents = (role) => {
        const parentRoles = PARENT_ROLE_MAP[role];
        if (!parentRoles) return [];
        const rolesToMatch = Array.isArray(parentRoles) ? parentRoles : [parentRoles];
        
        return allUsers.filter(u => {
            const uRole = u.role;
            return rolesToMatch.some(r => r.toLowerCase() === uRole.toLowerCase()) && u.isActive !== false;
        });
    };

    // Get valid child candidates for a given user
    const getValidChildCandidates = (user) => {
        const childRoles = CHILD_ROLE_MAP[user.role];
        if (!childRoles) return [];
        return allUsers.filter(u => {
            const uRole = u.role;
            return childRoles.some(r => r.toLowerCase() === uRole.toLowerCase()) && 
                   u.isActive !== false && 
                   u.id !== user.id
        });
    };

    // Toggle child selection
    const toggleChild = (childId) => {
        setSelectedChildren(prev =>
            prev.includes(childId)
                ? prev.filter(id => id !== childId)
                : [...prev, childId]
        );
    };

    // Find a user's manager name
    const getManagerName = (managedById) => {
        if (!managedById) return null;
        const manager = allUsers.find(u => u.id === managedById);
        return manager ? `${manager.name} (${manager.role})` : null;
    };

    // Group unassigned by role
    const unassignedByRole = {};
    unassigned.forEach(u => {
        if (u.role === ROLES.ADMIN) return;
        if (!unassignedByRole[u.role]) unassignedByRole[u.role] = [];
        unassignedByRole[u.role].push(u);
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Organization Hierarchy</h1>
                    <p className="text-gray-400">Manage the tree structure: Admin → Finance User → Project Manager → Vendor</p>
                </motion.div>

                {/* Power hierarchy legend */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 mb-6 border border-white/10"
                >
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="text-gray-400 font-medium">Power Hierarchy:</span>
                        {[ROLES.VENDOR, ROLES.PROJECT_MANAGER, ROLES.FINANCE_USER, ROLES.ADMIN].map((role, i) => {
                            const conf = ROLE_CONFIG[role];
                            return (
                                <span key={role} className="flex items-center gap-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${conf.bg} ${conf.text}`}>{role}</span>
                                    {i < 3 && <span className="text-gray-500 mx-1">&lt;</span>}
                                </span>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Alerts */}
                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4">
                            {error}
                            <button onClick={() => setError(null)} className="float-right">×</button>
                        </motion.div>
                    )}
                    {success && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-lg mb-4">
                            {success}
                        </motion.div>
                    )}
                </AnimatePresence>

                {loading ? (
                    <div className="text-center text-gray-400 py-20">
                        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        Loading hierarchy...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Tree View (main) */}
                        <div className="lg:col-span-2">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
                            >
                                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <span>🌳</span> Hierarchy Tree
                                </h2>
                                {tree.length === 0 ? (
                                    <div className="text-gray-400 text-center py-8">
                                        No hierarchy structure yet. Assign users to managers to build the tree.
                                    </div>
                                ) : (
                                    tree.map(root => (
                                        <TreeNode
                                            key={root.id}
                                            node={root}
                                            onOpenAssign={openAssignModal}
                                            onUnassign={handleUnassign}
                                        />
                                    ))
                                )}
                            </motion.div>
                        </div>

                        {/* Unassigned Users (sidebar) */}
                        <div className="lg:col-span-1">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
                            >
                                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <span>📋</span> Available for Assignment
                                </h2>
                                {Object.keys(unassignedByRole).length === 0 ? (
                                    <div className="text-gray-400 text-center py-4 text-sm">
                                        All users are assigned! 🎉
                                    </div>
                                ) : (
                                    Object.entries(unassignedByRole).map(([role, users]) => {
                                        const conf = ROLE_CONFIG[role] || { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/40' };
                                        return (
                                            <div key={role} className="mb-4">
                                                <h3 className={`text-sm font-medium ${conf.text} mb-2`}>{role}s</h3>
                                                <div className="space-y-2">
                                                    {users.map(u => (
                                                        <div key={u.id}
                                                            className={`flex items-center justify-between p-2 rounded-lg ${conf.bg} border ${conf.border}`}>
                                                            <div className="min-w-0 flex-1">
                                                                <div className={`text-sm font-medium ${conf.text} truncate`}>{u.name}</div>
                                                                <div className="text-xs text-gray-400 truncate">{u.email}</div>
                                                            </div>
                                                            <button
                                                                onClick={() => openAssignModal(u)}
                                                                className="shrink-0 px-3 py-1 text-xs bg-purple-600/40 text-purple-200 rounded-lg hover:bg-purple-600/60 transition-colors"
                                                            >
                                                                Assign
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </motion.div>

                            {/* Stats */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mt-6"
                            >
                                <h2 className="text-lg font-semibold text-white mb-4">📊 Stats</h2>
                                <div className="space-y-3">
                                    {[ROLES.ADMIN, ROLES.FINANCE_USER, ROLES.PROJECT_MANAGER, ROLES.VENDOR].map(role => {
                                        const count = allUsers.filter(u => u.role === role).length;
                                        const conf = ROLE_CONFIG[role];
                                        return (
                                            <div key={role} className="flex items-center justify-between">
                                                <span className={`text-sm ${conf.text}`}>{conf.icon} {role}</span>
                                                <span className={`text-sm font-bold ${conf.text}`}>{count}</span>
                                            </div>
                                        );
                                    })}
                                    <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                                        <span className="text-sm text-gray-300">Total</span>
                                        <span className="text-sm font-bold text-white">{allUsers.length}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* ========== ADVANCED ASSIGNMENT MODAL ========== */}
                <AnimatePresence>
                    {assignModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                            onClick={() => { setAssignModal(null); setSelectedParent(''); setSelectedChildren([]); }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-800/95 backdrop-blur-xl rounded-2xl p-8 w-full max-w-lg border border-white/20 max-h-[85vh] overflow-y-auto"
                            >
                                {/* Modal Header */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${(ROLE_CONFIG[assignModal.role] || {}).bg || 'bg-gray-500/20'}`}>
                                        {(ROLE_CONFIG[assignModal.role] || {}).icon || '👤'}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Manage {assignModal.name}</h2>
                                        <p className="text-sm text-gray-400">{assignModal.role} · {assignModal.email}</p>
                                    </div>
                                </div>

                                {/* ===== CHILDREN SECTION (Managers select subordinates) ===== */}
                                {CHILD_ROLE_MAP[assignModal.role] && (() => {
                                    const childRoles = CHILD_ROLE_MAP[assignModal.role];
                                    const candidates = getValidChildCandidates(assignModal);

                                    return (
                                        <div className="mb-6">
                                            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                                                <span>⬇️</span> Assign Subordinates ({childRoles.join(', ')})
                                            </h3>
                                            <p className="text-xs text-gray-500 mb-3">
                                                Select the {childRoles.join('/')}s that report to {assignModal.name}. 
                                            </p>

                                            {candidates.length === 0 ? (
                                                <p className="text-xs text-gray-500 italic">No {childRoles.join('/')}s available</p>
                                            ) : (
                                                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                                    {candidates.map(c => {
                                                        const isSelected = selectedChildren.includes(c.id);
                                                        const cConf = ROLE_CONFIG[c.role] || {};
                                                        const currentManager = getManagerName(c.managedBy);
                                                        const isOtherManager = c.managedBy && c.managedBy !== assignModal.id;

                                                        return (
                                                            <label
                                                                key={c.id}
                                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border transition-all ${
                                                                    isSelected
                                                                        ? `${cConf.bg} ${cConf.border} ring-1 ring-white/10`
                                                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleChild(c.id)}
                                                                    className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className={`text-sm font-medium ${isSelected ? cConf.text : 'text-gray-300'} truncate`}>
                                                                        {c.name}
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-500 truncate">
                                                                        {c.email}
                                                                        {isOtherManager && (
                                                                            <span className="ml-1 text-amber-400/80"> · Currently under {currentManager}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cConf.bg} ${cConf.text}`}>
                                                                    {c.role}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Selection count */}
                                            <div className="mt-2 text-xs text-gray-500">
                                                {selectedChildren.length} user{selectedChildren.length !== 1 ? 's' : ''} selected
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Action Buttons */}
                                <div className="flex gap-4 pt-2 border-t border-white/10">
                                    <button
                                        onClick={() => { setAssignModal(null); setSelectedParent(''); setSelectedChildren([]); }}
                                        className="flex-1 px-4 py-2.5 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveAssignment}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/20"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
