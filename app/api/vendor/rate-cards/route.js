import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ROLES, getNormalizedRole } from '@/constants/roles';
import RateCard from '@/models/RateCard';
import connectToDatabase from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/vendor/rate-cards
 * Fetches active rate cards for the logged-in vendor.
 * Optional query param: ?projectId=... to get project-specific rates
 */
export async function GET(request) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Use normalized role check for robustness
        const normalizedRole = getNormalizedRole(session.user);
        if (normalizedRole !== ROLES.VENDOR) {
            return NextResponse.json({ error: 'Unauthorized — vendor role required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const vendorId = session.user.vendorId;

        if (!vendorId) {
            return NextResponse.json({
                rateCards: [],
                warning: 'No vendor entity linked to this account'
            });
        }

        await connectToDatabase();

        // Build query:
        // - Must match this vendor
        // - Must be ACTIVE status
        // - Must not be expired (effectiveTo is null, missing, or in the future)
        // - Optionally filter by projectId (with fallback to global cards)

        const conditions = [
            { vendorId: vendorId },
            { status: 'ACTIVE' },
            // Handle effectiveTo: null (field exists with null value), missing field, or future date
            {
                $or: [
                    { effectiveTo: null },
                    { effectiveTo: { $exists: false } },
                    { effectiveTo: { $gte: new Date() } }
                ]
            }
        ];

        // If projectId is specified, return both project-specific and global cards
        if (projectId) {
            conditions.push({
                $or: [
                    { projectId: projectId },
                    { projectId: null },
                    { projectId: { $exists: false } }
                ]
            });
        }

        const rateCards = await RateCard.find({ $and: conditions }).sort({ projectId: -1, effectiveFrom: -1 });

        return NextResponse.json({ rateCards });
    } catch (error) {
        console.error('Error fetching vendor rate cards:', error);
        return NextResponse.json({ error: 'Failed to fetch rate cards' }, { status: 500 });
    }
}
