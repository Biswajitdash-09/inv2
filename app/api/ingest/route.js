import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processInvoice } from '@/lib/processor';
import { getCurrentUser } from '@/lib/server-auth';
import { sendStatusNotification } from '@/lib/notifications';
import { ROLES } from '@/constants/roles';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Get the authenticated user to associate invoice with vendor
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Vercel Fix: Do not write to filesystem (read-only).
        // Convert to Base64 Data URI for immediate access/preview.
        const base64String = buffer.toString('base64');

        // Determine MIME type from file extension if not provided
        let mimeType = file.type;
        if (!mimeType) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            const mimeMap = {
                'pdf': 'application/pdf',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'xls': 'application/vnd.ms-excel',
                'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png'
            };
            mimeType = mimeMap[ext] || 'application/pdf';
        }

        const fileUrl = `data:${mimeType};base64,${base64String}`;

        const invoiceId = `INV-${uuidv4().slice(0, 8).toUpperCase()}`;
        const receivedAt = new Date().toISOString();
        const invoiceMetadata = {
            id: invoiceId,
            vendorName: user.role === ROLES.VENDOR ? user.name : 'Pending Identification',
            submittedByUserId: user.id, // So vendor list filters by user.id and updates correctly
            vendorId: user.role === ROLES.VENDOR && user.vendorId ? user.vendorId : undefined, // Uniquely identify which vendor uploaded (admin/PM)
            originalName: file.name,
            fileUrl: fileUrl,
            status: 'RECEIVED',
            receivedAt,
            auditUsername: user.name || 'Vendor',
            auditAction: 'SUBMIT',
            auditDetails: `Invoice "${file.name}" submitted via vendor portal (${user.role === ROLES.VENDOR ? 'Vendor' : user.role})`,
            // Manual Entry Fields
            project: formData.get('projectId'),
            assignedPM: formData.get('assignedPM'),
            invoiceNumber: formData.get('invoiceNumber'), // Manual override
            date: formData.get('date'), // Manual override
            amount: formData.get('amount') ? parseFloat(formData.get('amount')) : undefined, // Manual override
            dueDate: formData.get('dueDate') // Manual override
        };

        // Persist to DB and create audit trail (Admin can see via Audit log - RBAC)
        await db.saveInvoice(invoiceId, invoiceMetadata);

        // Perform processing inline (Simulation)
        const result = await processInvoice(invoiceId, buffer);

        if (result.success) {
            await db.saveInvoice(invoiceId, {
                ...result.data,
                // Preserve vendor identity & Project/PM
                submittedByUserId: invoiceMetadata.submittedByUserId,
                vendorName: invoiceMetadata.vendorName,
                vendorId: invoiceMetadata.vendorId,
                project: invoiceMetadata.project,
                assignedPM: invoiceMetadata.assignedPM,

                // Prioritize Manual Entry over IDP (if provided)
                invoiceNumber: invoiceMetadata.invoiceNumber || result.data.invoiceNumber || invoiceMetadata.invoiceNumber,
                date: invoiceMetadata.date || result.data.date,
                amount: invoiceMetadata.amount || result.data.amount,
                dueDate: invoiceMetadata.dueDate || result.data.dueDate,

                fileUrl: fileUrl,
                validation: result.validation,
                matching: result.matching,
                status: (result.validation.isValid && result.matching?.isMatched) ? 'VERIFIED' :
                    (result.status || (!result.validation.isValid ? 'VALIDATION_REQUIRED' : 'MATCH_DISCREPANCY')),
                processedAt: new Date().toISOString(),
                digitizedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }

        // Notify vendor that invoice was received (FR-1: acknowledgment within 5 min)
        const savedInvoice = await db.getInvoice(invoiceId);
        if (savedInvoice) {
            await sendStatusNotification(savedInvoice, 'RECEIVED').catch((err) =>
                console.error('[Ingest] Notification failed:', err)
            );
        }

        return NextResponse.json({
            message: 'Invoice received and processing started',
            invoice: await db.getInvoice(invoiceId)
        });

    } catch (error) {
        console.error('Ingestion error:', error);
        return NextResponse.json({ error: 'Failed to process invoice ingestion' }, { status: 500 });
    }
}
