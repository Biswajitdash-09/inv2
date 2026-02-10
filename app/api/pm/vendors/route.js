import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getNormalizedRole } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/server-auth';
import { ROLES } from '@/constants/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = getNormalizedRole(user);

        // Only allow PMs and Admins
        if (![ROLES.PROJECT_MANAGER, ROLES.ADMIN].includes(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let vendorList = [];

        if (role === ROLES.ADMIN) {
            // Admin sees all vendors (users with role VENDOR)
            // leveraging db.getAllUsers to filter for vendors
            const allUsers = await db.getAllUsers();
            vendorList = allUsers.filter(u => u.role === ROLES.VENDOR).map(v => ({
                id: v.vendorId || v.id, // Prefer vendor ID if linked
                name: v.name,
                linkedUserId: v.id,
                email: v.email
            }));
        } else {
            // PM sees vendors for assigned projects
            if (!user.assignedProjects || user.assignedProjects.length === 0) {
                return NextResponse.json([]);
            }
            vendorList = await db.getVendorsForProjects(user.assignedProjects);
        }

        return NextResponse.json(vendorList);
    } catch (error) {
        console.error('Error fetching PM vendors:', error);
        return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
    }
}
