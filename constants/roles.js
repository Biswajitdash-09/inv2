/**
 * Helper to normalize role strings
 * Handles variations like 'Project Manager' -> 'PM'
 */
export const getNormalizedRole = (user) => {
    if (!user?.role) return '';
    const rawRole = user.role;
    if (rawRole === 'Project Manager' || rawRole === 'ProjectManager' || rawRole?.toLowerCase() === 'project manager') {
        return ROLES.PROJECT_MANAGER;
    }
    if (rawRole === 'FinanceUser' || rawRole === 'Finance User') {
        return ROLES.FINANCE_USER;
    }
    return rawRole;
};

/**
 * Check if user has permission for a specific action
 * 
 * Role Hierarchy:
 * - Admin: Full system access (includes audit logs, analytics, system health)
 * - Finance User: Operational role - processes invoices, HIL review, approvals, digitization, matching
 * - Project Manager: Approves invoices for assigned projects
 * - Vendor: Submits invoices, views own invoices
 */

export const ROLES = {
    ADMIN: 'Admin',
    PROJECT_MANAGER: 'PM',
    FINANCE_USER: 'Finance User',
    VENDOR: 'Vendor'
};

export const MENU_PERMISSIONS = {
    'Dashboard': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.FINANCE_USER],
    'Digitization': [ROLES.FINANCE_USER],
    'Matching': [ROLES.ADMIN, ROLES.FINANCE_USER, ROLES.PROJECT_MANAGER],
    'Approvals': [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
    'Documents': [ROLES.ADMIN, ROLES.FINANCE_USER, ROLES.PROJECT_MANAGER],
    'Messages': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.VENDOR],
    'Vendors': [ROLES.ADMIN, ROLES.FINANCE_USER, ROLES.VENDOR],
    'Analytics': [ROLES.ADMIN],
    'Configuration': [ROLES.ADMIN],
    'User Management': [ROLES.ADMIN],
    'Audit Logs': [ROLES.ADMIN]
};

/**
 * Check if user has permission for a specific action
 * @param {Object} user - User object with role property
 * @param {string} action - Action to check permission for
 * @returns {boolean} - Whether user has permission
 */
export const hasPermission = (user, action, resource = null) => {
    if (!user) return false;
    const effectiveRole = getNormalizedRole(user);
    if (effectiveRole === ROLES.ADMIN) return true;

    switch (action) {
        case 'CONFIGURE_SYSTEM':
        case 'MANAGE_USERS':
            return effectiveRole === ROLES.ADMIN;

        case 'APPROVE_MATCH':
            // PMs can only approve if the resource (invoice) belongs to their project
            if (effectiveRole === ROLES.PROJECT_MANAGER) {
                if (resource && resource.project) {
                    return user.assignedProjects?.includes(resource.project);
                }
                return true; // General permission check
            }
            return effectiveRole === ROLES.FINANCE_USER;

        case 'FINALIZE_PAYMENT':
            return [ROLES.ADMIN, ROLES.FINANCE_USER].includes(effectiveRole);

        case 'PROCESS_DISCREPANCIES':
        case 'MANUAL_ENTRY':
            return effectiveRole === ROLES.FINANCE_USER;

        case 'VIEW_AUDIT_LOGS':
        case 'VIEW_COMPLIANCE':
            return effectiveRole === ROLES.ADMIN;

        case 'SUBMIT_INVOICE':
            return [ROLES.VENDOR, ROLES.FINANCE_USER].includes(effectiveRole);

        case 'VIEW_ALL_INVOICES':
            // Vendors and PMs have scoped views, so they don't have "VIEW_ALL"
            // But they can view "Invoices", just a subset.
            // This permission name might be misleading. Let's interpret it as "Access Invoice List"
            return [ROLES.ADMIN, ROLES.FINANCE_USER, ROLES.PROJECT_MANAGER, ROLES.VENDOR].includes(effectiveRole);

        default:
            return false;
    }
};

/**
 * Check if user can see a specific menu item
 * @param {Object} user - User object with role property
 * @param {string} itemName - Menu item name
 * @returns {boolean} - Whether user can see the menu item
 */
export const canSeeMenuItem = (user, itemName) => {
    if (!user) return false;
    const userRole = getNormalizedRole(user);
    if (userRole === ROLES.ADMIN) return true;

    const allowedRoles = MENU_PERMISSIONS[itemName];
    if (!allowedRoles) return true; // Default to visible if not defined

    return allowedRoles.includes(userRole);
};
