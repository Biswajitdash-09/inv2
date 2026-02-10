import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const filters = {};

        const status = searchParams.get('status');
        if (status) {
            filters.status = status.includes(',') ? status.split(',') : status;
        }

        const limit = searchParams.get('limit');
        if (limit) filters.limit = limit;

        const invoices = await db.getInvoices(user, filters);
        const sorted = invoices.sort((a, b) =>
            new Date(b.receivedAt || b.updatedAt || b.created_at) - new Date(a.receivedAt || a.updatedAt || a.created_at)
        );
        return NextResponse.json(sorted, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        return NextResponse.json(
            { error: 'Failed to fetch invoices', details: error.message },
            { status: 500 }
        );
    }
}
