import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getNormalizedRole } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/server-auth';
import { ROLES } from '@/constants/roles';
import User from '@/models/User';
import connectToDatabase from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await getCurrentUser();
        const role = getNormalizedRole(user);
        if (!user || role !== ROLES.PROJECT_MANAGER) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectToDatabase();

        // Fetch eligible delegates (e.g. Finance Users or Admins)
        // For simplicity, let's allow Finance Users
        const financeUsers = await User.find({ role: ROLES.FINANCE_USER }, 'id name email');

        return NextResponse.json(financeUsers);
    } catch (error) {
        console.error('Error fetching delegates:', error);
        return NextResponse.json({ error: 'Failed to fetch delegates' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getCurrentUser();
        const role = getNormalizedRole(user);
        if (!user || role !== ROLES.PROJECT_MANAGER) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const data = await request.json();
        const { delegateUserId, durationDays = 7 } = data;

        if (!delegateUserId) {
            // Remove delegation if empty
            await connectToDatabase();
            await User.updateOne(
                { id: user.id },
                { $unset: { delegatedTo: "", delegationExpiresAt: "" } }
            );
            return NextResponse.json({ success: true, message: 'Delegation removed' });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(durationDays));

        await connectToDatabase();
        await User.updateOne(
            { id: user.id },
            {
                delegatedTo: delegateUserId,
                delegationExpiresAt: expiresAt
            }
        );

        return NextResponse.json({ success: true, message: `Authority delegated for ${durationDays} days` });

    } catch (error) {
        console.error('Error setting delegation:', error);
        return NextResponse.json({ error: 'Failed to set delegation' }, { status: 500 });
    }
}
