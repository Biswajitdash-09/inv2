import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import DocumentUpload from '@/models/DocumentUpload';
import RateCard from '@/models/RateCard';
import { getSession } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';
import { ROLES } from '@/constants/roles';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

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
        const body = Object.fromEntries(formData);
        const invoiceFile = formData.get('invoice');
        const lineItems = formData.get('lineItems') ? JSON.parse(formData.get('lineItems')) : [];
        
        // Calculate total amount from line items if present, otherwise use provided amount
        // But for this phase, we trust the Vendor's provided Amount for the header, 
        // and Validate the Line Items total = Header Amount.
        
        let calculatedTotal = 0;
        if (lineItems.length > 0) {
             calculatedTotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        }

        // Validate: Header Amount should match Line Items Total (approx)
        if (lineItems.length > 0 && Math.abs(calculatedTotal - Number(body.amount)) > 1.0) {
             return NextResponse.json(
                { error: `Invoice Amount (${body.amount}) does not match Line Items Total (${calculatedTotal})` },
                { status: 400 }
            );
        }

        const billingMonth = formData.get('billingMonth');
        const assignedPM = formData.get('assignedPM');
        const project = formData.get('project');
        const amount = formData.get('amount');
        const basicAmount = formData.get('basicAmount');
        const taxType = formData.get('taxType');
        const hsnCode = formData.get('hsnCode');
        const invoiceNumber = formData.get('invoiceNumber');
        const invoiceDate = formData.get('invoiceDate');
        const assignedFinanceUser = formData.get('assignedFinanceUser');
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
        
        // Validate Line Items against Rate Card
        if (lineItems.length > 0) {
            // Find applicable rate cards
            // Priority: Project-specific > Global
            const vendorEntityId = session.user.vendorId;
            
            if (!vendorEntityId) {
                return NextResponse.json(
                    { error: 'No vendor entity linked to this account. Rate validation cannot be performed.' },
                    { status: 400 }
                );
            }
            
            const rateQuery = {
                vendorId: vendorEntityId,
                status: 'ACTIVE',
                $or: [
                    { effectiveTo: { $exists: false } },
                    { effectiveTo: { $gte: new Date() } }
                ]
            };
            
            if (project) {
                 rateQuery.$or.push({ projectId: project });
                 rateQuery.$or.push({ projectId: null });
            } else {
                 rateQuery.projectId = null;
            }

            const rateCards = await RateCard.find(rateQuery).sort({ projectId: -1, effectiveFrom: -1 }); // Project specific first
            
            // Flatten rates for easier lookup
            const availableRates = [];
            rateCards.forEach(card => {
                if (card.rates) {
                    card.rates.forEach(r => {
                         // Add only if not already present (respecting priority)
                         if (!availableRates.find(ar => ar.role === r.role && ar.experienceRange === r.experienceRange)) {
                             availableRates.push(r);
                         }
                    });
                }
            });

            // Validate each item
            lineItems.forEach(item => {
                const match = availableRates.find(r => r.role === item.role && r.experienceRange === item.experienceRange);
                if (match) {
                    // Check rate, allow for minor floating point diff? strict for now.
                    if (Math.abs(match.rate - Number(item.rate)) < 0.01) {
                        item.status = 'MATCH';
                    } else {
                        item.status = 'MISMATCH';
                        item.description = (item.description || '') + ` [Rate Mismatch: Expected ${match.rate}, Got ${item.rate}]`;
                    }
                } else {
                    item.status = 'MANUAL'; // No rate card found for this role
                    item.description = (item.description || '') + ` [No Rate Card Found]`;
                }
            });
        }

        // Vercel Fix: Store as Base64 Data URI instead of writing to filesystem
        const invoiceBuffer = Buffer.from(await invoiceFile.arrayBuffer());
        const invoiceBase64 = invoiceBuffer.toString('base64');
        const invoiceMimeType = invoiceFile.type || 'application/pdf';
        const invoiceFileUrl = `data:${invoiceMimeType};base64,${invoiceBase64}`;
        const invoiceId = uuidv4();

        // Create invoice record
        const invoice = await Invoice.create({
            id: invoiceId,
            vendorName: session.user.name || session.user.email,
            submittedByUserId: session.user.id,
            vendorId: session.user.vendorId || null,
            originalName: invoiceFile.name,
            receivedAt: new Date(),
            invoiceNumber: invoiceNumber || null,
            date: invoiceDate || null,
            invoiceDate: invoiceDate || null,
            amount: amount ? parseFloat(amount) : null,
            basicAmount: basicAmount ? parseFloat(basicAmount) : null,
            taxType: taxType || '',
            hsnCode: hsnCode || null,
            status: 'Submitted',
            originatorRole: 'Vendor',
            fileUrl: invoiceFileUrl,
            project: project || null,
            assignedPM: assignedPM || null,
            assignedFinanceUser: assignedFinanceUser || null,
            pmApproval: { status: 'PENDING' },
            financeApproval: { status: 'PENDING' },
            hilReview: { status: 'PENDING' },
            lineItems: lineItems,
            documents: [],
            auditTrail: [{
                action: 'SUBMITTED',
                actor: session.user.name || session.user.email || 'Vendor',
                actorId: session.user.id,
                actorRole: 'Vendor',
                timestamp: new Date(),
                previousStatus: null,
                newStatus: 'Submitted',
                notes: notes || 'Invoice submitted by vendor'
            }]
        });

        // Process additional documents
        const documentIds = [];

        // Save timesheet if provided
        if (timesheetFile) {
            const tsBuffer = Buffer.from(await timesheetFile.arrayBuffer());
            const tsBase64 = tsBuffer.toString('base64');
            const tsMimeType = timesheetFile.type || 'application/pdf';
            const tsFileUrl = `data:${tsMimeType};base64,${tsBase64}`;
            const tsId = uuidv4();

            await DocumentUpload.create({
                id: tsId,
                invoiceId: invoiceId,
                type: 'TIMESHEET',
                fileName: timesheetFile.name,
                fileUrl: tsFileUrl,
                mimeType: tsMimeType,
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
            const annexBuffer = Buffer.from(await annexFile.arrayBuffer());
            const annexBase64 = annexBuffer.toString('base64');
            const annexMimeType = annexFile.type || 'application/pdf';
            const annexFileUrl = `data:${annexMimeType};base64,${annexBase64}`;
            const annexId = uuidv4();

            await DocumentUpload.create({
                id: annexId,
                invoiceId: invoiceId,
                type: 'RFP_COMMERCIAL',
                fileName: annexFile.name,
                fileUrl: annexFileUrl,
                mimeType: annexMimeType,
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

        // Notify assigned PM that a new invoice needs review
        if (assignedPM) {
            try {
                const pmUser = await db.getUserById(assignedPM);
                const msgId = uuidv4();
                const invoiceLabel = invoiceNumber || invoiceId.slice(0, 8);
                await connectToDatabase();
                const Message = (await import('@/models/Message')).default;
                await Message.create({
                    id: msgId,
                    invoiceId: invoiceId,
                    projectId: project || null,
                    senderId: session.user.id,
                    senderName: session.user.name || session.user.email,
                    senderRole: 'Vendor',
                    recipientId: assignedPM,
                    recipientName: pmUser?.name || 'Project Manager',
                    subject: `New Invoice for Review: ${invoiceLabel}`,
                    content: `A new invoice (${invoiceLabel}) has been submitted by ${session.user.name || session.user.email} and assigned to you for review.${notes ? ' Notes: ' + notes : ''}`,
                    messageType: 'STATUS_UPDATE',
                    threadId: msgId
                });
                console.log(`[Vendor Submit] PM notification sent to ${assignedPM}`);
            } catch (msgErr) {
                console.error('[Vendor Submit] Failed to notify PM:', msgErr);
            }
        }

        // Notify assigned Finance User about the new submission
        if (assignedFinanceUser) {
            try {
                const finUser = await db.getUserById(assignedFinanceUser);
                const msgId = uuidv4();
                const invoiceLabel = invoiceNumber || invoiceId.slice(0, 8);
                await connectToDatabase();
                const Message = (await import('@/models/Message')).default;
                await Message.create({
                    id: msgId,
                    invoiceId: invoiceId,
                    projectId: project || null,
                    senderId: session.user.id,
                    senderName: session.user.name || session.user.email,
                    senderRole: 'Vendor',
                    recipientId: assignedFinanceUser,
                    recipientName: finUser?.name || 'Finance User',
                    subject: `New Invoice Submitted: ${invoiceLabel}`,
                    content: `A new invoice (${invoiceLabel}) has been submitted by ${session.user.name || session.user.email}. It is currently pending PM review.${notes ? ' Notes: ' + notes : ''}`,
                    messageType: 'STATUS_UPDATE',
                    threadId: msgId
                });
                // console.log(`[Vendor Submit] Finance notification sent to ${assignedFinanceUser}`);
            } catch (msgErr) {
                console.error('[Vendor Submit] Failed to notify Finance:', msgErr);
            }
        }

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
