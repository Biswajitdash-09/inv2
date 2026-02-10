import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ROLES } from '@/constants/roles';
import { getNormalizedRole } from '@/constants/roles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pms - Get list of Project Managers
 * Accessible to authenticated users (for vendor invoice submission)
 */
export async function GET() {
    try {
        // Allow any authenticated user to get PM list for assignment
        const users = await db.getAllUsers();

        // Filter to only return PMs with limited info (no sensitive data)
        const pms = users
            .filter(u => getNormalizedRole(u) === ROLES.PROJECT_MANAGER && u.isActive !== false)
            .map(pm => ({
                id: pm.id,
                name: pm.name,
                email: pm.email,
                department: pm.department || null
            }));

        return NextResponse.json({ pms });
    } catch (error) {
        console.error('Error fetching PMs:', error);
        return NextResponse.json({ error: 'Failed to fetch PMs' }, { status: 500 });
    }
}
