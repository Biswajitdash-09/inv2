import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/server-auth';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// POST handler for manual invoice submission
export async function POST(request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse FormData
        const formData = await request.formData();

        // Extract form fields
        const vendorName = formData.get('vendorName');
        const vendorEmail = formData.get('vendorEmail');
        const invoiceNumber = formData.get('invoiceNumber');
        const amount = formData.get('amount');
        const currency = formData.get('currency') || 'USD';
        const date = formData.get('date');
        const description = formData.get('description');
        const poNumber = formData.get('poNumber');
        const project = formData.get('project');
        const status = formData.get('status') || 'manually_submitted';
        const submittedByUserId = formData.get('submittedByUserId');
        const document = formData.get('document');

        // Validation
        if (!vendorName || !invoiceNumber || !amount || !date) {
            return NextResponse.json(
                { error: 'Missing required fields: vendorName, invoiceNumber, amount, date' },
                { status: 400 }
            );
        }

        // Validate amount is a positive number
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return NextResponse.json(
                { error: 'Amount must be a positive number' },
                { status: 400 }
            );
        }

        // Check if invoice number already exists
        const allInvoices = await db.getInvoices(user, {});
        const duplicateInvoice = allInvoices.find(inv => inv.invoiceNumber === invoiceNumber);
        if (duplicateInvoice) {
            return NextResponse.json(
                { error: 'Invoice number already exists' },
                { status: 409 }
            );
        }

        // Generate unique invoice ID
        const invoiceId = 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

        let fileUrl = null;
        let originalName = null;

        // Handle vendor - create if new
        let vendorId = null;
        const vendors = await db.getAllVendors();
        const existingVendor = vendors.find(v => v.name === vendorName);

        if (existingVendor) {
            vendorId = existingVendor.id;
        } else {
            // Create new vendor
            try {
                const newVendor = await db.createVendor({
                    id: 'v-' + Date.now(),
                    name: vendorName,
                    email: vendorEmail || null,
                    status: 'active',
                    linkedUserId: null
                });
                vendorId = newVendor.id;
            } catch (vendorError) {
                console.error('Failed to create vendor:', vendorError);
                // Continue with null vendorId - invoice can still be created
            }
        }

        if (document && document.size > 0) {
            try {
                // Read document as buffer for DB persistence (Base64)
                const bytes = await document.arrayBuffer();
                const buffer = Buffer.from(bytes);
                const base64 = buffer.toString('base64');
                
                // Determine MIME type from file extension if not provided
                let mimeType = document.type;
                if (!mimeType) {
                    const ext = document.name.split('.').pop()?.toLowerCase();
                    const mimeMap = {
                        'pdf': 'application/pdf',
                        'doc': 'application/msword',
                        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'xls': 'application/vnd.ms-excel',
                        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'jpg': 'image/jpeg',
                        'jpeg': 'image/jpeg',
                        'png': 'image/png',
                        'csv': 'text/csv'
                    };
                    mimeType = mimeMap[ext] || 'application/pdf';
                }

                // Set file URL as Data URI for direct DB persistence
                fileUrl = `data:${mimeType};base64,${base64}`;
                originalName = document.name;
            } catch (fileError) {
                console.error('Failed to process document for DB persistence:', fileError);
                // Continue without file - invoice can still be created
            }
        }

        // Create invoice with manually_submitted status
        const invoiceData = {
            vendorName,
            vendorId,
            submittedByUserId: submittedByUserId || user.id,
            invoiceNumber,
            amount: numericAmount,
            currency,
            date,
            description,
            poNumber,
            project,
            status,
            fileUrl,
            originalName,
            receivedAt: new Date(),
            auditUsername: user.name || user.email || 'Finance User',
            auditAction: 'CREATE',
            auditDetails: `Manually submitted invoice: ${invoiceNumber} from ${vendorName}`
        };

        // Save invoice
        await db.saveInvoice(invoiceId, invoiceData);

        // Create audit trail entry
        await db.createAuditTrailEntry({
            username: user.name || user.email || 'Finance User',
            action: 'MANUAL_SUBMISSION',
            details: `Invoice ${invoiceNumber} manually submitted with status: ${status}`,
            invoice_id: invoiceId
        });

        // Return success response
        return NextResponse.json({
            success: true,
            message: 'Invoice submitted successfully',
            invoice: {
                id: invoiceId,
                invoiceNumber,
                vendorName,
                amount: numericAmount,
                currency,
                status,
                fileUrl
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating invoice:', error);
        return NextResponse.json(
            { error: 'Failed to create invoice', details: error.message },
            { status: 500 }
        );
    }
}

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

        const invoices = await db.getInvoices(user, filters, { includeFiles: false });
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
