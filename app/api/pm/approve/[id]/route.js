import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { requireRole, checkPermission, getNormalizedRole } from '@/lib/rbac';
import { sendStatusNotification } from '@/lib/notifications';
import { ROLES } from '@/constants/roles';
import Message from '@/models/Message';
import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/mongodb';
import {
    INVOICE_STATUS,
    validateTransition,
    generateAuditMessage
} from '@/lib/invoice-workflow';

/**
 * POST /api/pm/approve/:id - PM approval for invoice
 */
export async function POST(request, { params }) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const roleCheck = requireRole([ROLES.ADMIN, ROLES.PROJECT_MANAGER])(session.user);
        if (!roleCheck.allowed) {
            return NextResponse.json({ error: roleCheck.reason }, { status: 403 });
        }

        const userRole = getNormalizedRole(session.user);

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

        // Validate workflow state - PM can review invoices in various statuses
        // This matches the filter logic in app/pm/approval-queue/page.jsx
        const allowPMReview = [
            'RECEIVED',
            'DIGITIZING',
            'VALIDATION_REQUIRED',
            'VERIFIED',
            'PENDING_APPROVAL',
            'MATCH_DISCREPANCY',
            'Pending',
            INVOICE_STATUS.SUBMITTED,
            INVOICE_STATUS.PENDING_PM_APPROVAL,
            INVOICE_STATUS.MORE_INFO_NEEDED
        ].includes(invoice.status) || !invoice.pmApproval?.status || invoice.pmApproval?.status === 'PENDING' || invoice.pmApproval?.status === 'INFO_REQUESTED';

        if (!allowPMReview) {
            return NextResponse.json(
                { error: `Invalid workflow state: Invoice status '${invoice.status}' is not valid for PM review. Valid statuses: RECEIVED, DIGITIZING, VALIDATION_REQUIRED, VERIFIED, PENDING_APPROVAL, MATCH_DISCREPANCY, PENDING_PM_APPROVAL, or pmApproval.isEmpty()` },
                { status: 400 }
            );
        }

        // Prevent workflow issues - Finance should not have reviewed yet
        if (invoice.financeApproval?.status && invoice.financeApproval?.status !== 'PENDING') {
            return NextResponse.json(
                { error: 'Invalid workflow: Finance already reviewed this invoice before PM' },
                { status: 400 }
            );
        }

        // Check PM has access to this project (skip for admin)
        if (userRole === ROLES.PROJECT_MANAGER) {
            if (!checkPermission(session.user, 'APPROVE_INVOICE', invoice)) {
                return NextResponse.json(
                    { error: 'You are not authorized to approve invoices for this project' },
                    { status: 403 }
                );
            }
        }

        // Define status transitions for PM actions using constants
        const statusTransitions = {
            [INVOICE_STATUS.PENDING_PM_APPROVAL]: {
                'APPROVE': INVOICE_STATUS.PENDING_FINANCE_REVIEW,
                'REJECT': INVOICE_STATUS.PM_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            // Support old system statuses - transition through pm approval workflow
            'RECEIVED': {
                'APPROVE': INVOICE_STATUS.PENDING_FINANCE_REVIEW,
                'REJECT': INVOICE_STATUS.PM_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            'DIGITIZING': {
                'APPROVE': INVOICE_STATUS.PENDING_FINANCE_REVIEW,
                'REJECT': INVOICE_STATUS.PM_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            'VALIDATION_REQUIRED': {
                'APPROVE': INVOICE_STATUS.PENDING_FINANCE_REVIEW,
                'REJECT': INVOICE_STATUS.PM_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            'VERIFIED': {
                'APPROVE': INVOICE_STATUS.PENDING_FINANCE_REVIEW,
                'REJECT': INVOICE_STATUS.PM_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            'PENDING_APPROVAL': {
                'APPROVE': INVOICE_STATUS.PENDING_FINANCE_REVIEW,
                'REJECT': INVOICE_STATUS.PM_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            'MATCH_DISCREPANCY': {
                'APPROVE': INVOICE_STATUS.PENDING_FINANCE_REVIEW,
                'REJECT': INVOICE_STATUS.PM_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            [INVOICE_STATUS.SUBMITTED]: {
                'APPROVE': INVOICE_STATUS.PENDING_FINANCE_REVIEW,
                'REJECT': INVOICE_STATUS.PM_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            'Pending': {
                'APPROVE': INVOICE_STATUS.PENDING_FINANCE_REVIEW,
                'REJECT': INVOICE_STATUS.PM_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            },
            [INVOICE_STATUS.MORE_INFO_NEEDED]: {
                'APPROVE': INVOICE_STATUS.PENDING_FINANCE_REVIEW,
                'REJECT': INVOICE_STATUS.PM_REJECTED,
                'REQUEST_INFO': INVOICE_STATUS.MORE_INFO_NEEDED
            }
        };

        // Determine new status based on action
        const newStatus = statusTransitions[invoice.status]?.[action];
        console.log('[PM Approve] Status mapping:', {
            invoiceStatus: invoice.status,
            action: action,
            newStatus: newStatus,
            statusTransitionsKeys: Object.keys(statusTransitions),
            hasMapping: !!statusTransitions[invoice.status]
        });
        if (!newStatus) {
            return NextResponse.json(
                { error: `Invalid action '${action}' for invoice status '${invoice.status}'` },
                { status: 400 }
            );
        }

        // Validate the transition is allowed (only for statuses in the workflow state machine)
        const workflowStatuses = Object.values(INVOICE_STATUS);
        if (workflowStatuses.includes(invoice.status)) {
            const transitionValidation = validateTransition(
                invoice.status,
                newStatus,
                userRole
            );
            if (!transitionValidation.allowed) {
                return NextResponse.json(
                    { error: transitionValidation.reason },
                    { status: 400 }
                );
            }
        }

        // Update PM approval
        const statusMap = {
            'APPROVE': 'APPROVED',
            'REJECT': 'REJECTED',
            'REQUEST_INFO': 'INFO_REQUESTED'
        };

        const pmApproval = {
            status: statusMap[action],
            approvedBy: session.user.id,
            approvedByRole: userRole,
            approvedAt: new Date().toISOString(),
            notes: notes || null
        };

        // Generate audit message using workflow function
        const roleName = getNormalizedRole(session.user);
        const auditDetails = generateAuditMessage(
            action,
            roleName,
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
            actorRole: userRole,
            timestamp: new Date().toISOString(),
            previousStatus: previousStatus,
            newStatus: newStatus,
            notes: notes || `PM ${action.toLowerCase().replace('_', ' ')} this invoice`,
            ipAddress: ipAddress,
            userAgent: userAgent
        };

        const updatedInvoice = await db.saveInvoice(id, {
            pmApproval,
            status: newStatus,
            auditUsername: session.user.name || session.user.email,
            auditAction: `PM_${action}`,
            auditDetails,
            auditTrailEntry
        });

        // Automated Messaging for Info Request - notifies Vendor
        if (action === 'REQUEST_INFO') {
            try {
                await connectToDatabase();
                const recipientId = updatedInvoice.submittedByUserId;
                if (recipientId) {
                    const vendor = await db.getUserById(recipientId);
                    const messageId = uuidv4();
                    await Message.create({
                        id: messageId,
                        invoiceId: updatedInvoice.id,
                        projectId: updatedInvoice.project || null,
                        senderId: session.user.id,
                        senderName: session.user.name || session.user.email,
                        senderRole: userRole,
                        recipientId: recipientId,
                        recipientName: vendor?.name || 'Vendor',
                        subject: `PM Info Required: Invoice ${updatedInvoice.invoiceNumber || updatedInvoice.id.slice(-6)}`,
                        content: notes || 'The Project Manager has requested additional information for your invoice.',
                        messageType: 'INFO_REQUEST',
                        threadId: messageId
                    });
                    console.log(`[PM Action] Info request sent to vendor (${recipientId})`);
                } else {
                    console.warn(`[PM Action] No vendor found for invoice ${id}, skipping message.`);
                }
            } catch (msgErr) {
                console.error('[PM Action] Failed to create info request message:', msgErr);
            }
        }

        // Notify Vendor on PM rejection (Finance hasn't seen it yet)
        if (action === 'REJECT') {
            try {
                await connectToDatabase();
                const invoiceLabel = updatedInvoice.invoiceNumber || updatedInvoice.id.slice(-6);

                // Notify Vendor
                const vendorId = updatedInvoice.submittedByUserId;
                if (vendorId) {
                    const vendor = await db.getUserById(vendorId);
                    const msgId = uuidv4();
                    await Message.create({
                        id: msgId,
                        invoiceId: updatedInvoice.id,
                        projectId: updatedInvoice.project || null,
                        senderId: session.user.id,
                        senderName: session.user.name || session.user.email,
                        senderRole: userRole,
                        recipientId: vendorId,
                        recipientName: vendor?.name || 'Vendor',
                        subject: `PM Rejected Invoice: ${invoiceLabel}`,
                        content: notes || 'Your invoice has been rejected by the Project Manager.',
                        messageType: 'REJECTION',
                        threadId: msgId
                    });
                    console.log(`[PM Reject] Rejection notification sent to vendor (${vendorId})`);
                }
            } catch (msgErr) {
                console.error('[PM Reject] Failed to create rejection notification:', msgErr);
            }
        }

        // Notify Finance User about PM decision (approve or reject)
        try {
            await connectToDatabase();
            const financeUserId = invoice.assignedFinanceUser;
            if (financeUserId) {
                const financeUser = await db.getUserById(financeUserId);
                const invoiceLabel = updatedInvoice.invoiceNumber || updatedInvoice.id.slice(-6);
                const msgId = uuidv4();
                const isApproval = action === 'APPROVE';
                await Message.create({
                    id: msgId,
                    invoiceId: updatedInvoice.id,
                    projectId: updatedInvoice.project || null,
                    senderId: session.user.id,
                    senderName: session.user.name || session.user.email,
                    senderRole: userRole,
                    recipientId: financeUserId,
                    recipientName: financeUser?.name || 'Finance User',
                    subject: isApproval
                        ? `PM Approved Invoice: ${invoiceLabel} — Ready for Finance Review`
                        : `PM Rejected Invoice: ${invoiceLabel}`,
                    content: isApproval
                        ? `Invoice ${invoiceLabel} has been approved by PM and is now pending your finance review.${notes ? ' PM Notes: ' + notes : ''}`
                        : `Invoice ${invoiceLabel} has been rejected by PM.${notes ? ' Reason: ' + notes : ''}`,
                    messageType: isApproval ? 'STATUS_UPDATE' : 'REJECTION',
                    threadId: msgId
                });
                console.log(`[PM Action] Finance notification sent to ${financeUserId} (${action})`);
            }
        } catch (msgErr) {
            console.error('[PM Action] Failed to send finance notification:', msgErr);
        }

        // Determine notification type based on action
        const notificationType = action === 'REJECT' ? 'REJECTED' :
            action === 'REQUEST_INFO' ? 'AWAITING_INFO' :
                'PENDING_APPROVAL';
        await sendStatusNotification(updatedInvoice, notificationType).catch((err) =>
            console.error('[PM Approve] Notification failed:', err)
        );

        // Determine workflow message based on action
        const workflowMessage = action === 'APPROVE' ? 'Proceeding to Finance review' :
            action === 'REQUEST_INFO' ? 'Awaiting information from vendor' :
                'Workflow ended at PM stage';

        return NextResponse.json({
            success: true,
            message: `PM ${action.toLowerCase().replace('_', ' ')} invoice successfully`,
            newStatus,
            workflow: workflowMessage
        });
    } catch (error) {
        console.error('Error processing PM approval:', error);
        return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
    }
}
