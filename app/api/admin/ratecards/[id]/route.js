import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import RateCard from '@/models/RateCard';
import { getSession } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';
import { ROLES } from '@/constants/roles';
import { db } from '@/lib/db';

/**
 * GET /api/admin/ratecards/:id - Get rate card details (Admin only)
 */
export async function GET(request, { params }) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const roleCheck = requireRole([ROLES.ADMIN])(session.user);
        if (!roleCheck.allowed) {
            return NextResponse.json({ error: roleCheck.reason }, { status: 403 });
        }

        await connectToDatabase();

        const { id } = await params;
        const ratecard = await RateCard.findOne({ id });

        if (!ratecard) {
            return NextResponse.json({ error: 'Rate card not found' }, { status: 404 });
        }

        // Enrich with vendor name
        const vendor = await db.getVendor(ratecard.vendorId);

        return NextResponse.json({
            ratecard: {
                ...ratecard.toObject(),
                vendorName: vendor?.name || 'Unknown Vendor'
            }
        });
    } catch (error) {
        console.error('Error fetching rate card:', error);
        return NextResponse.json({ error: 'Failed to fetch rate card' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/ratecards/:id - Update rate card (Admin only)
 */
export async function PUT(request, { params }) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const roleCheck = requireRole([ROLES.ADMIN])(session.user);
        if (!roleCheck.allowed) {
            return NextResponse.json({ error: roleCheck.reason }, { status: 403 });
        }

        await connectToDatabase();

        const { id } = await params;
        const body = await request.json();
        const { name, rates, effectiveFrom, effectiveTo, status, notes } = body;

        const existingCard = await RateCard.findOne({ id });
        if (!existingCard) {
            return NextResponse.json({ error: 'Rate card not found' }, { status: 404 });
        }

        // Build update
        const updateData = {};
        if (name) updateData.name = name;
        if (rates) updateData.rates = rates;
        if (effectiveFrom) updateData.effectiveFrom = new Date(effectiveFrom);
        if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;

        const ratecard = await RateCard.findOneAndUpdate(
            { id },
            updateData,
            { new: true }
        );

        // Audit trail
        await db.createAuditTrailEntry({
            invoice_id: null,
            username: session.user.name || session.user.email,
            action: 'RATE_CARD_UPDATED',
            details: `Updated rate card: ${ratecard.name}`
        });

        return NextResponse.json({ success: true, ratecard: ratecard.toObject() });
    } catch (error) {
        console.error('Error updating rate card:', error);
        return NextResponse.json({ error: 'Failed to update rate card' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/ratecards/:id - Archive rate card (Admin only)
 */
export async function DELETE(request, { params }) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const roleCheck = requireRole([ROLES.ADMIN])(session.user);
        if (!roleCheck.allowed) {
            return NextResponse.json({ error: roleCheck.reason }, { status: 403 });
        }

        await connectToDatabase();

        const { id } = await params;
        const ratecard = await RateCard.findOne({ id });

        if (!ratecard) {
            return NextResponse.json({ error: 'Rate card not found' }, { status: 404 });
        }

        // Soft delete - archive instead of delete
        await RateCard.findOneAndUpdate({ id }, { status: 'EXPIRED' });

        // Audit trail
        await db.createAuditTrailEntry({
            invoice_id: null,
            username: session.user.name || session.user.email,
            action: 'RATE_CARD_ARCHIVED',
            details: `Archived rate card: ${ratecard.name}`
        });

        return NextResponse.json({ success: true, message: 'Rate card archived' });
    } catch (error) {
        console.error('Error archiving rate card:', error);
        return NextResponse.json({ error: 'Failed to archive rate card' }, { status: 500 });
    }
}
