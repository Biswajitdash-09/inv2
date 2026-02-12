import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { ROLES } from '@/constants/roles';

export async function GET() {
    try {
        // Get current user from session
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user has Project Manager role or is an Admin
        const role = user.role;
        if (role !== ROLES.PROJECT_MANAGER && role !== ROLES.ADMIN) {
            return NextResponse.json({ error: 'Forbidden: Project Manager or Admin access required' }, { status: 403 });
        }

        // Fetch invoices with RBAC filtering (PM sees invoices for their assigned projects or explicitly assigned to them)
        const invoices = await db.getInvoices(user);

        // Calculate PM-specific statistics
        const stats = {
            totalInvoices: invoices.length,
            pendingApproval: invoices.filter(inv =>
                !inv.pmApproval?.status || inv.pmApproval?.status !== 'APPROVED'
            ).length,
            approvedCount: invoices.filter(inv =>
                inv.pmApproval?.status === 'APPROVED'
            ).length,
            discrepanciesCount: invoices.filter(inv => inv.status === 'MATCH_DISCREPANCY').length
        };

        // Return stats and filtered invoices
        return NextResponse.json({
            stats,
            invoices
        });

    } catch (error) {
        console.error('PM dashboard API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}