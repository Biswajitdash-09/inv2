"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import Icon from "@/components/Icon";
import { ROLES, ROLES_LIST } from "@/constants/roles";
import PageHeader from "@/components/Layout/PageHeader";

export default function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("ALL");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: ROLES.FINANCE_USER,
        assignedProjects: "",
        vendorId: "",
        isActive: true
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get("/api/users");
            setUsers(res.data);
        } catch (error) {
            toast.error("Failed to fetch users");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterRole === "ALL" || user.role === filterRole;
        return matchesSearch && matchesFilter;
    });

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role,
            assignedProjects: user.assignedProjects ? user.assignedProjects.join(", ") : "",
            vendorId: user.vendorId || "",
            isActive: user.isActive !== false
        });
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingUser(null);
        setFormData({
            name: "",
            email: "",
            password: "",
            role: ROLES.FINANCE_USER,
            assignedProjects: "",
            vendorId: "",
            isActive: true
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`/api/users/${id}`);
            toast.success("User deleted");
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete user");
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            await api.put(`/api/users/${user.id}`, { isActive: !user.isActive });
            toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
            fetchUsers();
        } catch (error) {
            toast.error("Failed to update user status");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                assignedProjects: formData.assignedProjects.split(",").map(s => s.trim()).filter(Boolean)
            };

            if (editingUser) {
                await api.put(`/api/users/${editingUser.id}`, payload);
                toast.success("User updated");
            } else {
                await api.post("/api/users", payload);
                toast.success("User created");
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.error || "Operation failed");
            console.error(error);
        }
    };

    const roleColors = {
        [ROLES.ADMIN]: 'bg-purple-50 text-purple-700 border-purple-100',
        [ROLES.PROJECT_MANAGER]: 'bg-orange-50 text-orange-700 border-orange-100',
        [ROLES.FINANCE_USER]: 'bg-teal-50 text-teal-700 border-teal-100',
        [ROLES.VENDOR]: 'bg-amber-50 text-amber-700 border-amber-100'
    };

    return (
        <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
            <PageHeader
                title="User Management"
                subtitle="Create, modify, and deactivate user accounts"
                icon="Users"
                accent="purple"
                actions={
                    <button
                        onClick={handleAdd}
                        className="flex items-center justify-center gap-2 h-10 px-4 sm:px-6 bg-primary text-white text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all whitespace-nowrap"
                    >
                        <Icon name="UserPlus" size={18} />
                        <span className="hidden xs:inline">Add User</span><span className="xs:hidden">Add</span>
                    </button>
                }
            />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Users</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{users.length}</h3>
                    </div>
                    <div className="p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Icon name="Users" size={20} />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-green-600">{users.filter(u => u.isActive !== false).length}</h3>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-50 text-green-600 rounded-xl">
                        <Icon name="CheckCircle" size={20} />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-sm flex items-center justify-between xs:col-span-2 md:col-span-1">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inactive</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-red-500">{users.filter(u => u.isActive === false).length}</h3>
                    </div>
                    <div className="p-2 sm:p-3 bg-red-50 text-red-500 rounded-xl">
                        <Icon name="XCircle" size={20} />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-3 sm:p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 relative">
                        <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name or email..."
                            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="px-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 font-medium shrink-0"
                    >
                        <option value="ALL">All Roles</option>
                        {ROLES_LIST.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center">
                        <Icon name="Users" size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No users found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">User</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 hidden sm:table-cell">Role</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 hidden md:table-cell">Scope</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                                                    {user.name?.charAt(0) || "?"}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-gray-900 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{user.name}</div>
                                                    <div className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">{user.email}</div>
                                                    <div className="sm:hidden mt-0.5">
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${roleColors[user.role] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                                            {user.role}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${roleColors[user.role] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleToggleStatus(user)}
                                                className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-xs font-bold border transition-colors ${user.isActive !== false
                                                    ? 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100'
                                                    : 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100'
                                                    }`}
                                            >
                                                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${user.isActive !== false ? 'bg-green-500' : 'bg-red-400'}`}></div>
                                                {user.isActive !== false ? 'Active' : 'Off'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            {user.assignedProjects?.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {user.assignedProjects.map(p => (
                                                        <span key={p} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-600 border border-gray-200">{p}</span>
                                                    ))}
                                                </div>
                                            )}
                                            {user.vendorId && (
                                                <span className="text-[10px] font-bold text-gray-500">Vendor: {user.vendorCode || user.vendorId}</span>
                                            )}
                                            {!user.assignedProjects?.length && !user.vendorId && (
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Icon name="Edit2" size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Icon name="Trash2" size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
                <span>Showing {filteredUsers.length} of {users.length} users</span>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{editingUser ? 'Edit User' : 'Add User'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                <Icon name="X" size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    disabled={!!editingUser}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-gray-500"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Minimum 8 characters"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    {ROLES_LIST.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>

                            {formData.role === ROLES.PROJECT_MANAGER && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Projects</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        value={formData.assignedProjects}
                                        onChange={e => setFormData({ ...formData, assignedProjects: e.target.value })}
                                        placeholder="Project A, Project B"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Comma-separated project names</p>
                                </div>
                            )}

                            {formData.role === ROLES.VENDOR && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor ID</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        value={formData.vendorId}
                                        onChange={e => setFormData({ ...formData, vendorId: e.target.value })}
                                        placeholder="v-001"
                                    />
                                </div>
                            )}

                            {editingUser && (
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <span className="text-sm font-medium text-gray-700">Active Status</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${formData.isActive ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all"
                                >
                                    {editingUser ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
