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

        // Verify user has Vendor role or is an Admin
        const role = user.role;
        if (role !== ROLES.VENDOR && role !== ROLES.ADMIN) {
            return NextResponse.json({ error: 'Forbidden: Vendor or Admin access required' }, { status: 403 });
        }

        // Fetch invoices with RBAC filtering (Vendor only sees their own invoices via submittedByUserId)
        const invoices = await db.getInvoices(user);

        // Calculate vendor-specific statistics
        const stats = {
            totalInvoices: invoices.length,
            paidCount: invoices.filter(inv => inv.status === 'PAID').length,
            processingCount: invoices.filter(inv => ['DIGITIZING', 'RECEIVED'].includes(inv.status)).length,
            totalBillingVolume: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
        };

        // Return stats and filtered invoices
        return NextResponse.json({
            stats,
            invoices
        });

    } catch (error) {
        console.error('Vendor dashboard API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}