import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { requireRole, checkPermission, getNormalizedRole } from '@/lib/rbac';
import { sendStatusNotification } from '@/lib/notifications';
import { ROLES } from '@/constants/roles';
import Message from '@/models/Message';
import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/mongodb';

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

        const invoice = await db.getInvoice(id);
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
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

        // Update invoice status based on action
        let newStatus = invoice.status;
        if (action === 'APPROVE') {
            newStatus = 'PM Approved';
        } else if (action === 'REJECT') {
            newStatus = 'Rejected';
        } else if (action === 'REQUEST_INFO') {
            newStatus = 'Info Requested';
        }

        const updatedInvoice = await db.saveInvoice(id, {
            pmApproval,
            status: newStatus,
            auditUsername: session.user.name || session.user.email,
            auditAction: `PM_${action}`,
            auditDetails: `PM ${action.toLowerCase().replace('_', ' ')}${notes ? `: ${notes}` : ''}`
        });

        // Automated Messaging for Info Request
        if (action === 'REQUEST_INFO') {
            try {
                await connectToDatabase();
                const recipientId = updatedInvoice.submittedByUserId;

                if (recipientId) {
                    const recipient = await db.getUserById(recipientId);
                    if (recipient) {
                        const messageId = uuidv4();
                        await Message.create({
                            id: messageId,
                            invoiceId: updatedInvoice.id,
                            projectId: updatedInvoice.project || null,
                            senderId: session.user.id,
                            senderName: session.user.name || session.user.email,
                            senderRole: userRole,
                            recipientId: recipient.id,
                            recipientName: recipient.name,
                            subject: `Info Request: Invoice ${updatedInvoice.invoiceNumber || updatedInvoice.id.slice(-6)}`,
                            content: notes || 'PM requested more information regarding this invoice.',
                            messageType: 'INFO_REQUEST',
                            threadId: messageId
                        });
                        console.log(`[PM Approve] Automated message created for vendor ${recipientId}`);
                    }
                } else {
                    console.warn(`[PM Approve] No submittedByUserId found for invoice ${id}, skipping automated message.`);
                }
            } catch (msgErr) {
                console.error('[PM Approve] Failed to create automated message:', msgErr);
            }
        }

        const notificationType = action === 'REJECT' ? 'REJECTED' : action === 'REQUEST_INFO' ? 'AWAITING_INFO' : 'PENDING_APPROVAL';
        await sendStatusNotification(updatedInvoice, notificationType).catch((err) =>
            console.error('[PM Approve] Notification failed:', err)
        );

        return NextResponse.json({
            success: true,
            message: `Invoice ${action.toLowerCase().replace('_', ' ')}`,
            newStatus
        });
    } catch (error) {
        console.error('Error processing PM approval:', error);
        return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
    }
}
