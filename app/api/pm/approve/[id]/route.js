import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { requireRole, checkPermission, getNormalizedRole } from '@/lib/rbac';
import { sendStatusNotification } from '@/lib/notifications';
import { ROLES } from '@/constants/roles';

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
