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

        // Only allow PMs, Admins, and Vendors
        if (![ROLES.PROJECT_MANAGER, ROLES.ADMIN, ROLES.VENDOR].includes(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let recipients = [];

        // Fetch all users once; filter strictly to opposite role of the sender
        const allUsers = await db.getAllUsers();

        if (role === ROLES.ADMIN || role === ROLES.PROJECT_MANAGER) {
            // PM/Admin must only see Vendors
            recipients = allUsers
                .filter(u => getNormalizedRole(u) === ROLES.VENDOR)
                // Never include the current user, even if roles ever overlap
                .filter(u => String(u.id) !== String(user.id))
                .map(v => ({
                    id: v.id,
                    name: v.name,
                    linkedUserId: v.id,
                    vendorId: v.vendorId,
                    email: v.email,
                    role: ROLES.VENDOR
                }));
            console.log(
                `[Messaging Recipients API] ${role} fetched ${recipients.length} vendor recipients`
            );
        } else if (role === ROLES.VENDOR) {
            // Vendor must only see PMs
            recipients = allUsers
                .filter(u => getNormalizedRole(u) === ROLES.PROJECT_MANAGER)
                .filter(u => String(u.id) !== String(user.id))
                .map(p => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    role: ROLES.PROJECT_MANAGER
                }));
            console.log(
                `[Messaging Recipients API] Vendor fetched ${recipients.length} PM recipients`
            );
        }

        return NextResponse.json(recipients);
    } catch (error) {
        console.error('Error fetching messaging recipients:', error);
        return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
    }
}