import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { performThreeWayMatch } from '@/lib/services/matching';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    const { id } = await params;
    const invoice = await db.getInvoice(id);

    if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
}

export async function PUT(request, { params }) {
    const { id } = await params;
    const updates = await request.json();

    const invoice = await db.getInvoice(id);
    if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    let finalUpdates = { ...updates };

    // Phase 3: Trigger Matching if data is being verified or updated
    // If status is moved to VERIFIED (meaning data entry is done), we run matching.
    if (updates.status === 'VERIFIED' || finalUpdates.poNumber) {
        console.log(`[API] Triggering Matching for ${id}`);

        // Merge existing invoice data with updates to ensure we have latest fields
        const invoiceDataForMatch = {
            ...invoice,
            ...updates
        };

        const matchingResults = await performThreeWayMatch(invoiceDataForMatch);

        finalUpdates.matching = matchingResults;

        // Logic: If matched, keep verified/matched status. If discrepancies, set status.
        if (matchingResults.isMatched) {
            finalUpdates.status = 'VERIFIED'; // Ready for approval
        } else {
            finalUpdates.status = 'MATCH_DISCREPANCY';
        }
    }

    const updatedInvoice = await db.saveInvoice(id, {
        ...finalUpdates,
        updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
        message: 'Invoice updated successfully',
        invoice: updatedInvoice
    });
}
