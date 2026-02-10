import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendStatusNotification } from '@/lib/notifications';
import { getCurrentUser } from '@/lib/server-auth';


export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    const { id } = await params;
    const { action, comments } = await request.json();

    // Strict Auth Check
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = user.role;
    const { ROLES } = await import('@/constants/roles');

    const invoice = await db.getInvoice(id);
    if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    let nextStatus = invoice.status;
    const timestampUpdates = {};
    const auditLog = {
        invoice_id: id,
        username: userRole || 'System',
        action: action,
        details: comments || `Action ${action} performed on invoice ${id}`
    };

    // State Machine (FR-5, FR-6)
    try {
        if (action === 'PROCESS_MATCH') {
            // Trigger 3-Way Check
            if (![ROLES.ADMIN, ROLES.FINANCE_USER].includes(userRole)) {
                return NextResponse.json({ error: 'Unauthorized to run matching.' }, { status: 403 });
            }

            const { matchingEngine } = await import('@/lib/matching');
            const matchResult = await matchingEngine.performThreeWayMatch(invoice);

            if (matchResult.status === 'MATCHED') {
                nextStatus = 'VERIFIED';
                auditLog.details = 'Automated 3-Way Match Successful';
            } else {
                nextStatus = 'MATCH_DISCREPANCY';
                auditLog.details = `Matching Failed: ${matchResult.discrepancies.join(', ')}`;
            }

            // Save match details to invoice
            await db.saveInvoice(id, {
                status: nextStatus,
                matching: matchResult,
                updatedAt: new Date().toISOString()
            });

            // Notification
            await sendStatusNotification({ ...invoice, status: nextStatus }, nextStatus);

            return NextResponse.json({
                message: `Matching complete. Status: ${nextStatus}`,
                invoice: await db.getInvoice(id)
            });
        }

        if (action === 'APPROVE') {
            if (invoice.status === 'RECEIVED' || invoice.status === 'DIGITIZING') {
                if (userRole !== ROLES.ADMIN) {
                    return NextResponse.json({ error: 'Only Admin can approve vendor submissions.' }, { status: 403 });
                }
                nextStatus = 'VERIFIED';
                auditLog.details = `Admin approved vendor submission: ${comments || 'No comments'}`;
                // Project Manager Approval
                if (userRole === ROLES.PROJECT_MANAGER) {
                    const isPmForProject = user.assignedProjects?.includes(invoice.project);
                    const isPmForInvoice = invoice.assignedPM === user.id;

                    if (!isPmForProject && !isPmForInvoice) {
                        return NextResponse.json({ error: 'You are not authorized to approve this invoice (not assigned to this project/invoice).' }, { status: 403 });
                    }
                } else if (userRole !== ROLES.ADMIN) {
                    return NextResponse.json({ error: 'Only a Project Manager can approve verified invoices.' }, { status: 403 });
                }
                nextStatus = 'PENDING_APPROVAL';
                timestampUpdates.pmApprovedAt = new Date().toISOString();
                auditLog.details = `PM Approved: ${comments || 'No comments'}`;
            } else if (invoice.status === 'PENDING_APPROVAL') {
                // Final Payment Release - Admin can release payment
                if (userRole !== ROLES.ADMIN) {
                    return NextResponse.json({ error: 'Only Admin can release final payment.' }, { status: 403 });
                }
                nextStatus = 'PAID';
                timestampUpdates.paidAt = new Date().toISOString();
                auditLog.details = `Payment Released: ${comments || 'No comments'}`;
            } else if (invoice.status === 'MATCH_DISCREPANCY' || invoice.status === 'VALIDATION_REQUIRED') {
                // Manual overrides for discrepancies
                if (![ROLES.ADMIN, ROLES.FINANCE_USER].includes(userRole)) {
                    return NextResponse.json({ error: 'Unauthorized to resolve discrepancies.' }, { status: 403 });
                }
                nextStatus = 'VERIFIED';
                auditLog.details = `Manual Override/Resolution: ${comments || 'No comments'}`;
            }
        } else if (action === 'REJECT') {
            if (![ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.FINANCE_USER].includes(userRole)) {
                return NextResponse.json({ error: 'Unauthorized to reject invoices.' }, { status: 403 });
            }
            nextStatus = 'REJECTED';
            auditLog.details = `Rejected by ${userRole}: ${comments || 'No reasons provided'}`;
        } else if (action === 'REQUEST_INFO') {
            if (userRole !== ROLES.PROJECT_MANAGER && userRole !== ROLES.ADMIN) {
                return NextResponse.json({ error: 'Only PMs can request info from vendors.' }, { status: 403 });
            }
            nextStatus = 'AWAITING_INFO';
            auditLog.details = `More Info Requested: ${comments || 'No specific requests'}`;
        } else if (action === 'RESTORE') {
            // Restore rejected/approved invoices back to review
            if (userRole !== ROLES.ADMIN) {
                return NextResponse.json({ error: 'Only Admin can restore invoices.' }, { status: 403 });
            }
            if (!['REJECTED', 'APPROVED'].includes(invoice.status)) {
                return NextResponse.json({ error: 'Can only restore REJECTED or APPROVED invoices.' }, { status: 400 });
            }
            nextStatus = 'PENDING_APPROVAL';
            auditLog.details = `Invoice restored to review: ${comments || 'No comments'}`;
        }

        const updatedInvoice = await db.saveInvoice(id, {
            ...timestampUpdates,
            status: nextStatus,
            updatedAt: new Date().toISOString()
        });

        // Detailed Audit Trail entry
        // The saveInvoice already inserts into audit_trail via our CDC, but this specific workflow log is high-level "Action"
        await db.createAuditTrailEntry(auditLog);

        // Trigger simulated notification
        await sendStatusNotification(updatedInvoice, nextStatus);

        return NextResponse.json({
            message: `Invoice moved to ${nextStatus}`,
            invoice: updatedInvoice
        });

    } catch (error) {
        console.error('Workflow error:', error);
        return NextResponse.json({ error: 'Workflow transition failed' }, { status: 500 });
    }
}
