import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { requireRole, getNormalizedRole } from '@/lib/rbac';
import { sendStatusNotification } from '@/lib/notifications';
import { ROLES } from '@/constants/roles';
import {
    INVOICE_STATUS,
    validateTransition,
    generateAuditMessage
} from '@/lib/invoice-workflow';

/**
 * POST /api/finance/approve/:id - Finance review and approval (SECOND approval step)
 * Finance reviews invoice AFTER PM has approved
 */
export async function POST(request, { params }) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const roleCheck = requireRole([ROLES.FINANCE_USER, ROLES.ADMIN])(session.user);
        if (!roleCheck.allowed) {
            return NextResponse.json({ error: roleCheck.reason }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action, notes } = body;

        if (!action || !['APPROVE', 'REJECT', 'REQUEST_INFO'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Must be APPROVE, REJECT, or REQUEST_INFO' },
                { status: 400 }
            );
        }

        // Capture request metadata for comprehensive audit logging
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        const invoice = await db.getInvoice(id);
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Capture previous status for audit
        const previousStatus = invoice.status;

        // Validate workflow state using state machine
        // Finance can transition from multiple valid finance-ready statuses
        const VALID_FINANCE_STATUSES = [
            INVOICE_STATUS.PENDING_FINANCE_REVIEW,
            'PM Approved',
            'APPROVED',
            'VERIFIED',
            'RECEIVED'
        ];
        if (!VALID_FINANCE_STATUSES.includes(invoice.status)) {
            return NextResponse.json(
                { error: `Invalid workflow state: Invoice status '${invoice.status}' is not pending Finance review. Finance can only review invoices in statuses: ${VALID_FINANCE_STATUSES.join(', ')}` },
                { status: 400 }
            );
        }

        // Check that PM has actually approved this invoice
        if (!invoice.pmApproval || invoice.pmApproval.status !== 'APPROVED') {
            return NextResponse.json(
                { error: 'PM approval required before Finance review' },
                { status: 400 }
            );
        }

        // Define status transitions for Finance actions for all valid statuses
        const statusTransitions = {
            [INVOICE_STATUS.PENDING_FINANCE_REVIEW]: {
                'APPROVE': INVOICE_STATUS.FINANCE_APPROVED,
                'REJECT': INVOICE_STATUS.FINANCE_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            'PM Approved': {
                'APPROVE': INVOICE_STATUS.FINANCE_APPROVED,
                'REJECT': INVOICE_STATUS.FINANCE_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            'APPROVED': {
                'APPROVE': INVOICE_STATUS.FINANCE_APPROVED,
                'REJECT': INVOICE_STATUS.FINANCE_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            'VERIFIED': {
                'APPROVE': INVOICE_STATUS.FINANCE_APPROVED,
                'REJECT': INVOICE_STATUS.FINANCE_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            'RECEIVED': {
                'APPROVE': INVOICE_STATUS.FINANCE_APPROVED,
                'REJECT': INVOICE_STATUS.FINANCE_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            }
        };

        // Determine new status based on action
        const newStatus = statusTransitions[invoice.status]?.[action];
        if (!newStatus) {
            return NextResponse.json(
                { error: `Invalid action '${action}' for invoice status '${invoice.status}'` },
                { status: 400 }
            );
        }

        // Validate the transition is allowed
        const role = requireRole([ROLES.FINANCE_USER, ROLES.ADMIN]).role || ROLES.FINANCE_USER;
        const transitionValidation = validateTransition(
            invoice.status,
            newStatus,
            role
        );
        if (!transitionValidation.allowed) {
            return NextResponse.json(
                { error: transitionValidation.reason },
                { status: 400 }
            );
        }

        // Update finance approval (SECOND approval step)
        const statusMap = {
            'APPROVE': 'APPROVED',
            'REJECT': 'REJECTED',
            'REQUEST_INFO': 'INFO_REQUESTED'
        };

        const financeApproval = {
            status: statusMap[action],
            approvedBy: session.user.id,
            approvedByRole: role,
            approvedAt: new Date().toISOString(),
            notes: notes || null
        };

        // Generate audit message using workflow function
        const roleName = getNormalizedRole(session.user);
        const auditDetails = generateAuditMessage(
            action,
            'Finance',
            invoice.invoiceNumber,
            invoice.status,
            newStatus,
            notes
        );

        // Create comprehensive audit entry
        const auditTrailEntry = {
            action: action.toLowerCase() === 'request_info' ? 'requested_info' : action.toLowerCase(),
            actor: session.user.name || session.user.email,
            actorId: session.user.id,
            actorRole: role,
            timestamp: new Date().toISOString(),
            previousStatus: previousStatus,
            newStatus: newStatus,
            notes: notes || `Finance ${action.toLowerCase().replace('_', ' ')} this invoice`,
            ipAddress: ipAddress,
            userAgent: userAgent
        };

        const updatedInvoice = await db.saveInvoice(id, {
            financeApproval,
            status: newStatus,
            auditUsername: session.user.name || session.user.email,
            auditAction: `FINANCE_${action}`,
            auditDetails,
            auditTrailEntry
        });

        const notificationType = action === 'APPROVE' ? 'FINANCE_APPROVED' :
                                action === 'REJECT' ? 'FINANCE_REJECTED' :
                                'AWAITING_INFO';
        await sendStatusNotification(updatedInvoice, notificationType).catch((err) =>
            console.error('[Finance Approve] Notification failed:', err)
        );

        return NextResponse.json({
            success: true,
            message: `Finance ${action.toLowerCase().replace('_', ' ')} invoice successfully`,
            newStatus,
            workflow: action === 'APPROVE' ? 'Invoice approved for payment' :
                       action === 'REQUEST_INFO' ? 'Awaiting additional information' :
                       'Workflow ended at Finance stage'
        });
    } catch (error) {
        console.error('Error processing finance approval:', error);
        return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
    }
}
