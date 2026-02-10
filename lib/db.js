// lib/db.js - MongoDB Implementation
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';
import { ROLES } from '@/constants/roles';
import { getNormalizedRole } from '@/lib/rbac';
import User from '@/models/User';
import Vendor from '@/models/Vendor';
import Invoice from '@/models/Invoice';
import Project from '@/models/Project';
import PurchaseOrder from '@/models/PurchaseOrder';
import Annexure from '@/models/Annexure';
import AuditTrail from '@/models/AuditTrail';
import Delegation from '@/models/Delegation';
import Notification from '@/models/Notification';

// Ensure connection is established before any operation
const connect = async () => await connectToDatabase();

export const db = {
    // --- Invoices ---
    getInvoices: async (user, filters = {}) => {
        try {
            await connect();
            let query = {};

            // RBAC Filtering
            if (user) {
                const role = getNormalizedRole(user);

                if (role === ROLES.PROJECT_MANAGER) {
                    // Check for projects delegated TO this user
                    const delegators = await User.find({
                        delegatedTo: user.id,
                        delegationExpiresAt: { $gt: new Date() }
                    });
                    const delegatedProjectIds = delegators.flatMap(u => u.assignedProjects || []);

                    // PMs see invoices for their assigned projects OR explicitly assigned to them OR delegated projects
                    query.$or = [
                        { project: { $in: [...(user.assignedProjects || []), ...delegatedProjectIds] } },
                        { assignedPM: user.id }
                    ];
                } else if (role === ROLES.VENDOR) {
                    // Vendors only see their own invoices - strict ID matching only
                    // Name-based matching removed for security (vendorName can be spoofed)
                    query.submittedByUserId = user.id;
                } else if ([ROLES.ADMIN, ROLES.FINANCE_USER].includes(role)) {
                    // These roles see all invoices
                } else {
                    // Unknown/Unauthorized role -> return empty
                    return [];
                }
            } else {
                // Strict Security: No user context provided -> return empty
                // This prevents accidental leaks if callers forget to pass user
                console.warn("db.getInvoices called without user context - returning empty array");
                return [];
            }

            const invoices = await Invoice.find(query).sort({ created_at: -1 });
            const list = invoices.map(doc => ({
                id: doc.id,
                vendorName: doc.vendorName,
                submittedByUserId: doc.submittedByUserId,
                vendorId: doc.vendorId,
                originalName: doc.originalName,
                receivedAt: doc.receivedAt,
                invoiceNumber: doc.invoiceNumber,
                date: doc.date,
                amount: doc.amount,
                status: doc.status,
                category: doc.category,
                dueDate: doc.dueDate,
                costCenter: doc.costCenter,
                accountCode: doc.accountCode,
                currency: doc.currency,
                fileUrl: doc.fileUrl,
                poNumber: doc.poNumber,
                project: doc.project,
                matching: doc.matching,
                created_at: doc.created_at
            }));

            // Enrich with vendorCode for Admin/PM/Finance so they see which vendor ID uploaded
            if (user && [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.FINANCE_USER].includes(user.role)) {
                const userIds = [...new Set(list.map(inv => inv.submittedByUserId).filter(Boolean))];
                const vendorIdsFromInvoices = [...new Set(list.map(inv => inv.vendorId).filter(Boolean))];
                let userToVendor = {};
                if (userIds.length) {
                    const users = await User.find({ id: { $in: userIds } }).select('id vendorId').lean();
                    userToVendor = Object.fromEntries(users.map(u => [u.id, u.vendorId]).filter(([, v]) => v));
                }
                const allVendorIds = [...new Set([...vendorIdsFromInvoices, ...Object.values(userToVendor)])].filter(Boolean);
                let vendorCodeByVendorId = {};
                if (allVendorIds.length) {
                    const vendors = await Vendor.find({ id: { $in: allVendorIds } }).lean();
                    vendors.forEach(v => {
                        const code = v.vendorCode || ('ve-' + String((v.id || '').replace(/^v-/, '') || '1').padStart(3, '0'));
                        vendorCodeByVendorId[v.id] = code;
                    });
                }
                list.forEach(inv => {
                    const vid = inv.vendorId || userToVendor[inv.submittedByUserId];
                    inv.vendorCode = vid ? (vendorCodeByVendorId[vid] || null) : null;
                });
            }

            return list;
        } catch (e) {
            console.error("Failed to fetch invoices from MongoDB", e);
            return [];
        }
    },

    getInvoice: async (id, requestingUser = null) => {
        try {
            await connect();
            const doc = await Invoice.findOne({ id });
            if (!doc) return null;
            const inv = {
                id: doc.id,
                vendorName: doc.vendorName,
                submittedByUserId: doc.submittedByUserId,
                vendorId: doc.vendorId,
                originalName: doc.originalName,
                receivedAt: doc.receivedAt,
                invoiceNumber: doc.invoiceNumber,
                date: doc.date,
                amount: doc.amount,
                status: doc.status,
                category: doc.category,
                dueDate: doc.dueDate,
                costCenter: doc.costCenter,
                accountCode: doc.accountCode,
                currency: doc.currency,
                fileUrl: doc.fileUrl,
                poNumber: doc.poNumber,
                project: doc.project,
                matching: doc.matching,
                created_at: doc.created_at
            };
            if (requestingUser && [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.FINANCE_USER].includes(requestingUser.role)) {
                const vid = inv.vendorId;
                if (!vid && inv.submittedByUserId) {
                    const u = await User.findOne({ id: inv.submittedByUserId }).select('vendorId').lean();
                    if (u?.vendorId) inv.vendorId = u.vendorId;
                }
                const resolvedVendorId = inv.vendorId;
                if (resolvedVendorId) {
                    const vDoc = await Vendor.findOne({ id: resolvedVendorId }).lean();
                    const code = vDoc?.vendorCode || (resolvedVendorId ? 've-' + String(resolvedVendorId).replace(/^v-/, '').padStart(3, '0') : null);
                    inv.vendorCode = code;
                } else inv.vendorCode = null;
            }
            return inv;
        } catch (e) {
            console.error(`Failed to fetch invoice ${id}`, e);
            return null;
        }
    },

    saveInvoice: async (id, data) => {
        try {
            await connect();
            const existing = await Invoice.findOne({ id });
            const updateData = {
                id,
                vendorName: data.vendorName || existing?.vendorName || 'Pending Identification',
                submittedByUserId: data.submittedByUserId ?? existing?.submittedByUserId,
                vendorId: data.vendorId !== undefined ? data.vendorId : existing?.vendorId,
                originalName: data.originalName,
                receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined,
                invoiceNumber: data.invoiceNumber,
                date: data.date,
                amount: data.amount,
                status: data.status,
                category: data.category,
                dueDate: data.dueDate,
                costCenter: data.costCenter,
                accountCode: data.accountCode,
                currency: data.currency || 'INR',
                fileUrl: data.fileUrl,
                poNumber: data.poNumber,
                project: data.project,
                matching: data.matching
            };
            // Remove undefined so we don't overwrite with null
            Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

            const doc = await Invoice.findOneAndUpdate(
                { id },
                updateData,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            // Audit Trail (RBAC: Admin has "Audit log access and review")
            if (data.status) {
                await AuditTrail.create({
                    invoice_id: id,
                    username: data.auditUsername || 'System',
                    action: data.auditAction || 'UPDATE',
                    details: data.auditDetails || `Status updated to ${data.status}`
                });
            }

            return {
                id: doc.id,
                vendorName: doc.vendorName,
                submittedByUserId: doc.submittedByUserId,
                originalName: doc.originalName,
                receivedAt: doc.receivedAt,
                invoiceNumber: doc.invoiceNumber,
                date: doc.date,
                amount: doc.amount,
                status: doc.status,
                category: doc.category,
                dueDate: doc.dueDate,
                costCenter: doc.costCenter,
                accountCode: doc.accountCode,
                currency: doc.currency,
                fileUrl: doc.fileUrl,
                poNumber: doc.poNumber,
                project: doc.project,
                matching: doc.matching,
                created_at: doc.created_at
            };
        } catch (e) {
            console.error(`Failed to save invoice ${id}`, e);
            throw e;
        }
    },

    deleteInvoice: async (id) => {
        try {
            await connect();
            await Invoice.deleteOne({ id });
        } catch (e) {
            console.error(`Failed to delete invoice ${id}`, e);
            throw e;
        }
    },

    // --- Vendors ---
    getVendor: async (id) => {
        try {
            await connect();
            const doc = await Vendor.findOne({ id });
            if (!doc) return null;
            const obj = doc.toObject();
            if (!obj.vendorCode && obj.id) obj.vendorCode = 've-' + String((obj.id || '').replace(/^v-/, '') || '1').padStart(3, '0');
            return obj;
        } catch (e) {
            console.error(`Failed to fetch vendor ${id}`, e);
            return null;
        }
    },

    getAllVendors: async () => {
        try {
            await connect();
            const vendors = await Vendor.find({}).sort({ name: 1 });
            return vendors.map(v => {
                const obj = v.toObject();
                if (!obj.vendorCode && obj.id) obj.vendorCode = 've-' + String((obj.id || '').replace(/^v-/, '') || '1').padStart(3, '0');
                return obj;
            });
        } catch (e) {
            console.error("Failed to fetch vendors", e);
            return [];
        }
    },

    createVendor: async (vendor) => {
        try {
            await connect();
            if (!vendor.vendorCode) {
                const last = await Vendor.findOne().sort({ vendorCode: -1 }).select('vendorCode').lean();
                let next = 1;
                if (last?.vendorCode) {
                    const n = parseInt(String(last.vendorCode).replace(/^ve-/, ''), 10);
                    if (!isNaN(n)) next = n + 1;
                }
                vendor.vendorCode = 've-' + String(next).padStart(3, '0');
            }
            const doc = await Vendor.findOneAndUpdate(
                { id: vendor.id },
                vendor,
                { upsert: true, new: true }
            );
            return doc.toObject();
        } catch (e) {
            console.error("Failed to create vendor", e);
            throw e;
        }
    },

    // --- Purchase Orders ---
    getPurchaseOrder: async (poNumber) => {
        try {
            await connect();
            const po = await PurchaseOrder.findOne({ poNumber });
            if (!po) return null;

            // Fetch Vendor Name (mock join)
            const vendor = await Vendor.findOne({ id: po.vendorId });

            return {
                ...po.toObject(),
                vendorName: vendor ? vendor.name : 'Unknown Vendor',
                items: po.items // Already embedded
            };
        } catch (e) {
            console.error(`Failed to fetch PO ${poNumber}`, e);
            return null;
        }
    },

    createPurchaseOrder: async (po) => {
        try {
            await connect();
            const doc = await PurchaseOrder.findOneAndUpdate(
                { id: po.id },
                {
                    ...po,
                    items: po.items // Embedded array maps directly
                },
                { upsert: true, new: true }
            );
            return doc.toObject();
        } catch (e) {
            console.error("Failed to create PO", e);
            throw e;
        }
    },

    // --- Annexures ---
    getAnnexureByPO: async (poId) => {
        try {
            await connect();
            const doc = await Annexure.findOne({ poId });
            return doc ? doc.toObject() : null;
        } catch (e) {
            console.error(`Failed to fetch annexure for PO ${poId}`, e);
            return null;
        }
    },

    createAnnexure: async (annexure) => {
        try {
            await connect();
            const doc = await Annexure.findOneAndUpdate(
                { id: annexure.id },
                annexure,
                { upsert: true, new: true }
            );
            return doc.toObject();
        } catch (e) {
            console.error("Failed to create annexure", e);
            throw e;
        }
    },

    // --- Users ---
    getUserByEmail: async (email) => {
        try {
            await connect();
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) return null;
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                assignedProjects: user.assignedProjects,
                vendorId: user.vendorId,
                isActive: user.isActive, // Include status
                password_hash: user.passwordHash // Map for compatibility with existing auth
            };
        } catch (e) {
            console.error(`Failed to fetch user by email: ${email}`, e);
            return null;
        }
    },

    createUser: async (user) => {
        try {
            await connect();
            const doc = await User.findOneAndUpdate(
                { id: user.id },
                {
                    id: user.id,
                    name: user.name,
                    email: user.email.toLowerCase(),
                    passwordHash: user.passwordHash,
                    role: user.role,
                    assignedProjects: user.assignedProjects || [],
                    vendorId: user.vendorId || null,
                    isActive: user.isActive !== undefined ? user.isActive : true // Default active
                },
                { upsert: true, new: true }
            );
            return {
                id: doc.id,
                name: doc.name,
                email: doc.email,
                role: doc.role,
                isActive: doc.isActive
            };
        } catch (e) {
            console.error("Failed to create user", e);
            throw e;
        }
    },

    getUserById: async (id) => {
        try {
            await connect();
            const user = await User.findOne({ id });
            if (!user) return null;
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                assignedProjects: user.assignedProjects,
                vendorId: user.vendorId,
                isActive: user.isActive
            };
        } catch (e) {
            console.error(`Failed to fetch user by id: ${id}`, e);
            return null;
        }
    },

    deleteUser: async (id) => {
        try {
            await connect();
            await User.deleteOne({ id });
            return true;
        } catch (e) {
            console.error(`Failed to delete user ${id}`, e);
            throw e;
        }
    },

    updateUserVendorId: async (userId, vendorId) => {
        try {
            await connect();
            const doc = await User.findOneAndUpdate(
                { id: userId },
                { $set: { vendorId } },
                { new: true }
            );
            return doc ? doc.toObject() : null;
        } catch (e) {
            console.error(`Failed to update vendorId for user ${userId}`, e);
            throw e;
        }
    },

    getAllUsers: async () => {
        try {
            await connect();
            const users = await User.find({}).sort({ created_at: -1 });
            const vendorIds = [...new Set(users.map(u => u.vendorId).filter(Boolean))];
            const vendors = vendorIds.length ? await Vendor.find({ id: { $in: vendorIds } }).lean() : [];
            const vendorById = Object.fromEntries(vendors.map(v => {
                const o = { ...v };
                if (!o.vendorCode && o.id) o.vendorCode = 've-' + String((o.id || '').replace(/^v-/, '') || '1').padStart(3, '0');
                return [o.id, o];
            }));
            return users.map(user => {
                const u = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    assignedProjects: user.assignedProjects || [],
                    vendorId: user.vendorId,
                    isActive: user.isActive
                };
                if (user.vendorId && vendorById[user.vendorId]) u.vendorCode = vendorById[user.vendorId].vendorCode;
                return u;
            });
        } catch (e) {
            console.error("Failed to fetch all users", e);
            return [];
        }
    },

    getVendorsForProjects: async (projectIds) => {
        try {
            await connect();
            if (!projectIds || projectIds.length === 0) return [];

            const projects = await Project.find({ id: { $in: projectIds } });
            const vendorIds = [...new Set(projects.flatMap(p => p.vendorIds || []))];

            if (vendorIds.length === 0) return [];

            const vendors = await Vendor.find({ id: { $in: vendorIds } });
            return vendors.map(v => ({
                id: v.id,
                name: v.name,
                email: v.email,
                linkedUserId: v.linkedUserId,
                status: v.status
            }));
        } catch (e) {
            console.error("Failed to fetch vendors for projects", e);
            return [];
        }
    },

    // --- Audit Trail ---
    createAuditTrailEntry: async (entry) => {
        try {
            await connect();

            // Use dynamic model reference to handle HMR
            const AuditTrailModel = mongoose.models.AuditTrail || AuditTrail;

            const payload = {
                username: entry.username,
                action: entry.action,
                details: entry.details
            };

            // Only include invoice_id if it has a value
            if (entry.invoice_id) {
                payload.invoice_id = entry.invoice_id;
            }

            await AuditTrailModel.create(payload);
        } catch (e) {
            // Log but don't fail the request if audit trail fails
            console.error("Failed to create audit trail entry (non-fatal):", e.message);
        }
    },

    getAuditTrail: async (invoiceId) => {
        try {
            await connect();
            const logs = await AuditTrail.find({ invoice_id: invoiceId }).sort({ timestamp: -1 });
            return logs.map(l => l.toObject());
        } catch (e) {
            console.error("Failed to fetch audit trail", e);
            return [];
        }
    },

    getAllAuditLogs: async (limit = 100) => {
        try {
            await connect();
            const logs = await AuditTrail.find({}).sort({ timestamp: -1 }).limit(limit);
            return logs.map(l => l.toObject());
        } catch (e) {
            console.error("Failed to fetch all audit logs", e);
            return [];
        }
    },

    // --- Notifications (email log) ---
    createNotification: async (entry) => {
        try {
            await connect();
            const doc = await Notification.create({
                recipient_email: entry.recipient_email,
                subject: entry.subject,
                message: entry.message,
                status: entry.status || 'SENT',
                sent_at: entry.sent_at ? new Date(entry.sent_at) : undefined,
                related_entity_id: entry.related_entity_id,
                notification_type: entry.notification_type
            });
            return doc.toObject();
        } catch (e) {
            console.error("Failed to create notification log", e);
            throw e;
        }
    },

    getNotifications: async ({ relatedEntityId = null, limit = 50 } = {}) => {
        try {
            await connect();
            const query = relatedEntityId ? { related_entity_id: relatedEntityId } : {};
            const list = await Notification.find(query).sort({ sent_at: -1 }).limit(limit);
            return list.map(n => n.toObject());
        } catch (e) {
            console.error("Failed to fetch notifications", e);
            return [];
        }
    },

    // --- Delegation ---
    getDelegation: async (username) => {
        try {
            await connect();
            const doc = await Delegation.findOne({ delegate_from: username, active: true });
            return doc ? doc.toObject() : null;
        } catch (e) {
            console.error("Failed to get delegation", e);
            return null;
        }
    },

    setDelegation: async (from, to) => {
        try {
            await connect();
            // Deactivate old
            await Delegation.updateMany(
                { delegate_from: from, active: true },
                { active: false }
            );
            // Create new
            await Delegation.create({
                delegate_from: from,
                delegate_to: to,
                active: true
            });
        } catch (e) {
            console.error("Failed to set delegation", e);
            throw e;
        }
    },

    // --- System Health ---
    testConnection: async () => {
        try {
            await connect();
            // Ping the database
            const mongoose = (await import('mongoose')).default;
            await mongoose.connection.db.admin().ping();
            return true;
        } catch (e) {
            console.error("DB connection test failed", e);
            throw e;
        }
    },

    // --- System Configuration ---
    getSystemConfig: async () => {
        try {
            await connect();
            const mongoose = (await import('mongoose')).default;
            const configCollection = mongoose.connection.collection('system_config');
            const config = await configCollection.findOne({ _id: 'global' });
            return config || null;
        } catch (e) {
            console.error("Failed to fetch system config", e);
            return null;
        }
    },

    saveSystemConfig: async (data) => {
        try {
            await connect();
            const mongoose = (await import('mongoose')).default;
            const configCollection = mongoose.connection.collection('system_config');

            const result = await configCollection.findOneAndUpdate(
                { _id: 'global' },
                { $set: { ...data, _id: 'global' } },
                { upsert: true, returnDocument: 'after' }
            );

            return result.value || result;
        } catch (e) {
            console.error("Failed to save system config", e);
            throw e;
        }
    },

    // --- Data Integrity Helpers ---
    /**
     * Synchronize Project Manager assignments between User and Project models
     * Ensures both User.assignedProjects and Project.assignedPMs are updated consistently
     * @param {string} userId - The ID of the user whose assignments are being updated
     * @param {string[]} projectIds - Array of project IDs the user is assigned to
     * @returns {boolean} - Success/failure status
     */
    syncPMAssignments: async (userId, projectIds) => {
        try {
            await connect();
            // 1. Update User's assignedProjects array
            await User.findOneAndUpdate({ id: userId }, { $set: { assignedProjects: projectIds } });

            // 2. Remove user from all projects they are NOT assigned to anymore
            await Project.updateMany(
                { assignedPMs: userId, id: { $nin: projectIds } },
                { $pull: { assignedPMs: userId } }
            );

            // 3. Add user to all projects they ARE now assigned to
            await Project.updateMany(
                { id: { $in: projectIds } },
                { $addToSet: { assignedPMs: userId } }
            );

            return true;
        } catch (e) {
            console.error("Failed to sync PM assignments", e);
            return false;
        }
    },

    /**
     * Legacy alias for syncPMAssignments - kept for backward compatibility
     */
    syncProjectAssignments: async (userId, projectIds) => {
        return db.syncPMAssignments(userId, projectIds);
    }
};
