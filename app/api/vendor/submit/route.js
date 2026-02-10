import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import DocumentUpload from '@/models/DocumentUpload';
import { getSession } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';
import { ROLES } from '@/constants/roles';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * POST /api/vendor/submit - Submit invoice with documents (Vendor only)
 */
export async function POST(request) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const roleCheck = requireRole([ROLES.VENDOR])(session.user);
        if (!roleCheck.allowed) {
            return NextResponse.json({ error: roleCheck.reason }, { status: 403 });
        }

        await connectToDatabase();

        const formData = await request.formData();
        const invoiceFile = formData.get('invoice');
        const billingMonth = formData.get('billingMonth');
        const assignedPM = formData.get('assignedPM');
        const project = formData.get('project');
        const amount = formData.get('amount');
        const invoiceNumber = formData.get('invoiceNumber');
        const invoiceDate = formData.get('invoiceDate');
        const notes = formData.get('notes');

        // Additional document files
        const timesheetFile = formData.get('timesheet');
        const annexFile = formData.get('annex') || formData.get('rfpCommercial');

        if (!invoiceFile) {
            return NextResponse.json(
                { error: 'Invoice file is required' },
                { status: 400 }
            );
        }

        // Create uploads directory
        const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
        await mkdir(uploadsDir, { recursive: true });

        // Save invoice file
        const invoiceBytes = await invoiceFile.arrayBuffer();
        const invoiceBuffer = Buffer.from(invoiceBytes);
        const invoiceId = uuidv4();
        const invoiceExt = path.extname(invoiceFile.name);
        const invoiceFileName = `${invoiceId}${invoiceExt}`;
        const invoiceFilePath = path.join(uploadsDir, invoiceFileName);
        await writeFile(invoiceFilePath, invoiceBuffer);

        // Create invoice record
        const invoice = await Invoice.create({
            id: invoiceId,
            vendorName: session.user.name || session.user.email,
            submittedByUserId: session.user.id,
            originalName: invoiceFile.name,
            receivedAt: new Date(),
            invoiceNumber: invoiceNumber || null,
            date: invoiceDate || null,
            amount: amount ? parseFloat(amount) : null,
            status: 'Pending',
            fileUrl: `/uploads/invoices/${invoiceFileName}`,
            project: project || null,
            assignedPM: assignedPM || null,
            pmApproval: { status: 'PENDING' },
            financeApproval: { status: 'PENDING' },
            hilReview: { status: 'PENDING' },
            documents: []
        });

        // Process additional documents
        const documentIds = [];
        const docsDir = path.join(process.cwd(), 'uploads', 'documents');
        await mkdir(docsDir, { recursive: true });

        // Save timesheet if provided
        if (timesheetFile) {
            const tsBytes = await timesheetFile.arrayBuffer();
            const tsBuffer = Buffer.from(tsBytes);
            const tsId = uuidv4();
            const tsExt = path.extname(timesheetFile.name);
            const tsFileName = `${tsId}${tsExt}`;
            await writeFile(path.join(docsDir, tsFileName), tsBuffer);

            await DocumentUpload.create({
                id: tsId,
                invoiceId: invoiceId,
                type: 'TIMESHEET',
                fileName: timesheetFile.name,
                fileUrl: `/uploads/documents/${tsFileName}`,
                mimeType: timesheetFile.type,
                fileSize: tsBuffer.length,
                uploadedBy: session.user.id,
                metadata: {
                    billingMonth,
                    projectId: project
                },
                status: 'PENDING'
            });
            documentIds.push({ documentId: tsId, type: 'TIMESHEET' });
        }

        // Save Annex if provided
        if (annexFile) {
            const annexBytes = await annexFile.arrayBuffer();
            const annexBuffer = Buffer.from(annexBytes);
            const annexId = uuidv4();
            const annexExt = path.extname(annexFile.name);
            const annexFileName = `${annexId}${annexExt}`;
            await writeFile(path.join(docsDir, annexFileName), annexBuffer);

            await DocumentUpload.create({
                id: annexId,
                invoiceId: invoiceId,
                type: 'ANNEX',
                fileName: annexFile.name,
                fileUrl: `/uploads/documents/${annexFileName}`,
                mimeType: annexFile.type,
                fileSize: annexBuffer.length,
                uploadedBy: session.user.id,
                metadata: {
                    billingMonth,
                    projectId: project
                },
                status: 'PENDING'
            });
            documentIds.push({ documentId: annexId, type: 'ANNEX' });
        }

        // Update invoice with document references
        if (documentIds.length > 0) {
            await Invoice.findOneAndUpdate(
                { id: invoiceId },
                { documents: documentIds }
            );
        }

        // Create audit trail
        await db.createAuditTrailEntry({
            invoice_id: invoiceId,
            username: session.user.name || session.user.email,
            action: 'INVOICE_SUBMITTED',
            details: `Vendor submitted invoice${documentIds.length > 0 ? ` with ${documentIds.length} document(s)` : ''}${assignedPM ? ` routed to PM` : ''}`
        });

        return NextResponse.json({
            success: true,
            invoiceId,
            message: 'Invoice submitted successfully',
            documentsAttached: documentIds.length
        }, { status: 201 });
    } catch (error) {
        console.error('Error submitting invoice:', error);
        return NextResponse.json({ error: 'Failed to submit invoice' }, { status: 500 });
    }
}
