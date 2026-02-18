// lib/invoice-workflow.js - Invoice workflow state machine
import { ROLES } from '@/constants/roles';

/**
 * Invoice Workflow Status Constants
 * Using constants to ensure consistency across the application
 */
export const INVOICE_STATUS = {
    SUBMITTED: 'Submitted',
    PENDING_PM_APPROVAL: 'Pending PM Approval',
    PENDING_FINANCE_REVIEW: 'Pending Finance Review',
    MORE_INFO_NEEDED: 'More Info Needed',
    PM_REJECTED: 'PM Rejected',
    FINANCE_REJECTED: 'Finance Rejected',
    FINANCE_APPROVED: 'Finance Approved'
};

/**
 * Complete workflow state machine definition
 * Maps each allowed transition from currentStatus to [newStatuses]
 * with optional role restrictions
 */
export const WORKFLOW_TRANSITIONS = {
    // Vendor submits invoice → automatically goes to PM review
    [INVOICE_STATUS.SUBMITTED]: [
        INVOICE_STATUS.PENDING_PM_APPROVAL,
        INVOICE_STATUS.PENDING_FINANCE_REVIEW,
        INVOICE_STATUS.PM_REJECTED,
        INVOICE_STATUS.MORE_INFO_NEEDED
    ],

    // PM reviews invoice
    [INVOICE_STATUS.PENDING_PM_APPROVAL]: [
        INVOICE_STATUS.PENDING_FINANCE_REVIEW,  // PM approves
        INVOICE_STATUS.PM_REJECTED,              // PM rejects
        INVOICE_STATUS.MORE_INFO_NEEDED          // PM needs more info
    ],

    // Finance reviews invoice (only after PM approves)
    [INVOICE_STATUS.PENDING_FINANCE_REVIEW]: [
        INVOICE_STATUS.FINANCE_APPROVED,         // Finance approves (final)
        INVOICE_STATUS.FINANCE_REJECTED,         // Finance rejects
        INVOICE_STATUS.MORE_INFO_NEEDED          // Finance needs more info
    ],

    // Vendor provides requested information → returns to appropriate review stage
    // Note: This transition requires determining which stage requested the info
    [INVOICE_STATUS.MORE_INFO_NEEDED]: [
        INVOICE_STATUS.PENDING_PM_APPROVAL,      // Info submitted to PM
        INVOICE_STATUS.PENDING_FINANCE_REVIEW,   // Info submitted to Finance / PM approves
        INVOICE_STATUS.PM_REJECTED,              // PM rejects after re-check
        INVOICE_STATUS.MORE_INFO_NEEDED          // PM re-requests info again
    ],

    // Terminal states - no further transitions
    [INVOICE_STATUS.PM_REJECTED]: [],
    [INVOICE_STATUS.FINANCE_REJECTED]: [],
    [INVOICE_STATUS.FINANCE_APPROVED]: []
};

/**
 * Role-specific state transition permissions
 * Determines which roles can initiate which transitions
 */
export const TRANSITION_PERMISSIONS = {
    // Vendors can only transition from 'More Info Needed' back to review stage
    [ROLES.VENDOR]: {
        [INVOICE_STATUS.MORE_INFO_NEEDED]: [
            INVOICE_STATUS.PENDING_PM_APPROVAL,
            INVOICE_STATUS.PENDING_FINANCE_REVIEW
        ]
    },

    // PMs can only transition from their review stage
    [ROLES.PROJECT_MANAGER]: {
        [INVOICE_STATUS.SUBMITTED]: [
            INVOICE_STATUS.PENDING_FINANCE_REVIEW,
            INVOICE_STATUS.PM_REJECTED,
            INVOICE_STATUS.MORE_INFO_NEEDED
        ],
        [INVOICE_STATUS.PENDING_PM_APPROVAL]: [
            INVOICE_STATUS.PENDING_FINANCE_REVIEW,
            INVOICE_STATUS.PM_REJECTED,
            INVOICE_STATUS.MORE_INFO_NEEDED
        ],
        [INVOICE_STATUS.MORE_INFO_NEEDED]: [
            INVOICE_STATUS.PENDING_FINANCE_REVIEW,
            INVOICE_STATUS.PM_REJECTED,
            INVOICE_STATUS.MORE_INFO_NEEDED
        ]
    },

    // Finance users can only transition from their review stage
    [ROLES.FINANCE_USER]: {
        [INVOICE_STATUS.PENDING_FINANCE_REVIEW]: [
            INVOICE_STATUS.FINANCE_APPROVED,
            INVOICE_STATUS.FINANCE_REJECTED,
            INVOICE_STATUS.MORE_INFO_NEEDED
        ]
    },

    // Admins can perform any transition
    [ROLES.ADMIN]: null // null means no restrictions
};

/**
 * Workflow stage descriptions for UI display
 */
export const WORKFLOW_STAGE_DESCRIPTIONS = {
    [INVOICE_STATUS.SUBMITTED]: {
        title: 'Invoice Submitted',
        description: 'Invoice has been submitted and is awaiting PM assignment',
        next_stage: 'Pending PM Approval'
    },
    [INVOICE_STATUS.PENDING_PM_APPROVAL]: {
        title: 'Pending PM Approval',
        description: 'Invoice is assigned to Project Manager for review',
        next_stage: 'Pending Finance Review'
    },
    [INVOICE_STATUS.PENDING_FINANCE_REVIEW]: {
        title: 'Pending Finance Review',
        description: 'Invoice has been approved by PM and is pending Finance approval',
        next_stage: 'Finance Approved'
    },
    [INVOICE_STATUS.MORE_INFO_NEEDED]: {
        title: 'More Information Required',
        description: 'Additional information has been requested. Please provide details.',
        next_stage: null
    },
    [INVOICE_STATUS.PM_REJECTED]: {
        title: 'PM Rejected',
        description: 'Invoice has been rejected by Project Manager',
        next_stage: null
    },
    [INVOICE_STATUS.FINANCE_REJECTED]: {
        title: 'Finance Rejected',
        description: 'Invoice has been rejected by Finance',
        next_stage: null
    },
    [INVOICE_STATUS.FINANCE_APPROVED]: {
        title: 'Finance Approved',
        description: 'Invoice has been approved for payment processing',
        next_stage: null
    }
};

/**
 * Terminal states that indicate workflow completion
 */
export const TERMINAL_STATUSES = [
    INVOICE_STATUS.PM_REJECTED,
    INVOICE_STATUS.FINANCE_REJECTED,
    INVOICE_STATUS.FINANCE_APPROVED
];

/**
 * Review stages that require action
 */
export const REVIEW_STATUSES = [
    INVOICE_STATUS.PENDING_PM_APPROVAL,
    INVOICE_STATUS.PENDING_FINANCE_REVIEW,
    INVOICE_STATUS.MORE_INFO_NEEDED
];

/**
 * Validate if a status transition is allowed
 * 
 * @param {string} currentStatus - Current invoice status
 * @param {string} newStatus - Desired new status
 * @param {string} role - User role attempting the transition
 * @returns {Object} - { allowed: boolean, reason?: string }
 */
export function validateTransition(currentStatus, newStatus, role = null) {
    // Check if current status is valid
    if (!currentStatus || !WORKFLOW_TRANSITIONS.hasOwnProperty(currentStatus)) {
        return {
            allowed: false,
            reason: `Invalid current status: ${currentStatus}`
        };
    }

    // Check if new status is valid
    if (!newStatus || !Object.values(INVOICE_STATUS).includes(newStatus)) {
        return {
            allowed: false,
            reason: `Invalid target status: ${newStatus}`
        };
    }

    // Check if transition exists in workflow
    const allowedTransitions = WORKFLOW_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
        return {
            allowed: false,
            reason: `Invalid transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`
        };
    }

    // Check role-based permissions if role is provided
    if (role && role !== ROLES.ADMIN) {
        const rolePermissions = TRANSITION_PERMISSIONS[role];
        if (rolePermissions !== null) {
            const roleAllowedTransitions = rolePermissions[currentStatus];
            if (!roleAllowedTransitions || !roleAllowedTransitions.includes(newStatus)) {
                return {
                    allowed: false,
                    reason: `${role} role is not authorized to perform transition from ${currentStatus} to ${newStatus}`
                };
            }
        }
    }

    return { allowed: true };
}

/**
 * Get allowed transitions for a given status and role
 * 
 * @param {string} currentStatus - Current invoice status
 * @param {string} role - User role
 * @returns {string[]} - Array of allowed status transitions
 */
export function getAllowedTransitions(currentStatus, role) {
    const transitions = WORKFLOW_TRANSITIONS[currentStatus] || [];

    // If admin, return all transitions
    if (role === ROLES.ADMIN) {
        return transitions;
    }

    // Filter transitions based on role permissions
    const rolePermissions = TRANSITION_PERMISSIONS[role];
    if (rolePermissions === null) {
        return transitions;
    }

    const roleAllowed = rolePermissions[currentStatus] || [];
    return transitions.filter(status => roleAllowed.includes(status));
}

/**
 * Determine the appropriate review stage after info is submitted
 * Based on which approval stage requested the info
 * 
 * @param {Object} invoice - Invoice object with approval data
 * @returns {string} - The appropriate status to transition to
 */
export function determineInfoReturnDestination(invoice) {
    // Check if Finance requested info
    if (invoice.financeApproval?.status === 'INFO_REQUESTED') {
        return INVOICE_STATUS.PENDING_FINANCE_REVIEW;
    }

    // Default to PM if PM requested info or if unsure
    if (invoice.pmApproval?.status === 'INFO_REQUESTED' || !invoice.pmApproval || invoice.pmApproval.status === 'PENDING') {
        return INVOICE_STATUS.PENDING_PM_APPROVAL;
    }

    // Fallback: if PM approved but Finance hasn't touched it yet, go to Finance
    if (invoice.pmApproval?.status === 'APPROVED') {
        return INVOICE_STATUS.PENDING_FINANCE_REVIEW;
    }

    // Default to PM
    return INVOICE_STATUS.PENDING_PM_APPROVAL;
}

/**
 * Check if a status is a terminal state (workflow complete)
 * 
 * @param {string} status - Invoice status to check
 * @returns {boolean}
 */
export function isTerminalStatus(status) {
    return TERMINAL_STATUSES.includes(status);
}

/**
 * Check if a status requires review action
 * 
 * @param {string} status - Invoice status to check
 * @returns {boolean}
 */
export function isReviewStatus(status) {
    return REVIEW_STATUSES.includes(status);
}

/**
 * Get the next expected stage in the workflow
 * 
 * @param {string} status - Current invoice status
 * @returns {string|null} - Next stage or null if terminal
 */
export function getNextStage(status) {
    const stage = WORKFLOW_STAGE_DESCRIPTIONS[status];
    return stage ? stage.next_stage : null;
}

/**
 * Get detailed stage information
 * 
 * @param {string} status - Invoice status
 * @returns {Object|null} - Stage description object
 */
export function getStageInfo(status) {
    return WORKFLOW_STAGE_DESCRIPTIONS[status] || null;
}

/**
 * Generate audit log message for a transition
 * 
 * @param {string} action - Action performed (APPROVE, REJECT, REQUEST_INFO)
 * @param {string} role - User role
 * @param {string} invoiceNumber - Invoice number
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {string} notes - Optional notes
 * @returns {string} - Formatted audit message
 */
export function generateAuditMessage(action, role, invoiceNumber, oldStatus, newStatus, notes = null) {
    const actionText = action.toLowerCase().replace('_', ' ');
    const baseMessage = `${role} ${actionText} invoice #${invoiceNumber}. Status changed from ${oldStatus} to ${newStatus}`;
    return notes ? `${baseMessage}. Notes: ${notes}` : baseMessage;
}