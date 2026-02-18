import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ROLES } from '@/constants/roles';
import RateCard from '@/models/RateCard';
import connectToDatabase from '@/lib/mongodb';

/**
 * GET /api/vendor/rate-cards
 * Fetches active rate cards for the logged-in vendor.
 * Optional query param: ?projectId=... to get project-specific rates
 */
export async function GET(request) {
    try {
        const session = await getSession();
        if (!session?.user || session.user.role !== ROLES.VENDOR) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

        // Find applicable rate cards
        // 1. Vendor-specific (global) or Project-specific
        // Priority: Project-specific > Global
        
        const query = {
            vendorId: vendorId,
            status: 'ACTIVE',
            $or: [
                { effectiveTo: { $exists: false } },
                { effectiveTo: { $gte: new Date() } }
            ]
        };

        if (projectId) {
            query.$or.push({ projectId: projectId });
            query.$or.push({ projectId: null }); // Fallback to global
        } else {
             query.projectId = null; // Only global if no project specified
        }

        const rateCards = await RateCard.find(query).sort({ projectId: -1, effectiveFrom: -1 });

        return NextResponse.json({ rateCards });
    } catch (error) {
        console.error('Error fetching vendor rate cards:', error);
        return NextResponse.json({ error: 'Failed to fetch rate cards' }, { status: 500 });
    }
}
