import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';
import { sendStatusNotification } from '@/lib/notifications';
import { ROLES } from '@/constants/roles';

/**
 * POST /api/finance/approve/:id - Final invoice approval (Finance User only)
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

        if (!action || !['APPROVE', 'REJECT'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Must be APPROVE or REJECT' },
                { status: 400 }
            );
        }

        const invoice = await db.getInvoice(id);
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Check if PM approval is required and complete
        if (invoice.assignedPM && invoice.pmApproval?.status !== 'APPROVED') {
            return NextResponse.json(
                { error: 'PM approval required before finance approval' },
                { status: 400 }
            );
        }

        // Update finance approval
        const financeApproval = {
            status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            approvedBy: session.user.id,
            approvedAt: new Date().toISOString(),
            notes: notes || null
        };

        // Update overall status based on approval
        const newStatus = action === 'APPROVE' ? 'Approved' : 'Rejected';

        const updatedInvoice = await db.saveInvoice(id, {
            financeApproval,
            status: newStatus,
            auditUsername: session.user.name || session.user.email,
            auditAction: `FINANCE_${action}`,
            auditDetails: `Finance ${action.toLowerCase()}ed invoice${notes ? `: ${notes}` : ''}`
        });

        const notificationType = action === 'APPROVE' ? 'PAID' : 'REJECTED';
        await sendStatusNotification(updatedInvoice, notificationType).catch((err) =>
            console.error('[Finance Approve] Notification failed:', err)
        );

        return NextResponse.json({
            success: true,
            message: `Invoice ${action.toLowerCase()}ed`,
            newStatus
        });
    } catch (error) {
        console.error('Error processing finance approval:', error);
        return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
    }
}
