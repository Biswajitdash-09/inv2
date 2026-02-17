import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server-auth';

export async function POST(request) {
    try {
        // Auth check
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Strict PDF-only validation
        const fileName = file.name?.toLowerCase() || '';
        if (!fileName.endsWith('.pdf') && file.type !== 'application/pdf') {
            return NextResponse.json(
                { error: 'Only PDF files are supported for OCR extraction.' },
                { status: 400 }
            );
        }

        // Convert the uploaded file to a Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Use pdf-parse v2 to extract text from the PDF
        // Worker import MUST come before PDFParse import (required for Vercel/serverless)
        await import('pdf-parse/worker');
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        const pdfData = await parser.getText();
        await parser.destroy();
        const fullText = pdfData.text || '';

        if (!fullText.trim()) {
            return NextResponse.json({
                success: true,
                data: {
                    invoiceNumber: null,
                    invoiceDate: null,
                    basicAmount: null,
                    totalAmount: null,
                    taxType: null,
                    hsnCode: null,
                },
                message: 'No text could be extracted from this PDF. It may be a scanned image.',
            });
        }

        // Extract fields from the text
        const extracted = parseInvoiceText(fullText);

        return NextResponse.json({
            success: true,
            data: extracted,
        });
    } catch (error) {
        console.error('[OCR] Extraction error:', error);
        return NextResponse.json(
            { error: 'OCR extraction failed. Please fill the fields manually.' },
            { status: 500 }
        );
    }
}

/**
 * Parse extracted PDF text and find invoice fields using regex.
 * Returns null for any field that cannot be found.
 */
function parseInvoiceText(text) {
    const result = {
        invoiceNumber: null,
        invoiceDate: null,
        basicAmount: null,
        totalAmount: null,
        taxType: null,
        hsnCode: null,
    };

    try {
        // ---- Invoice Number ----
        const invNumPatterns = [
            /(?:invoice\s*(?:no|number|#|num|id)[\s.:/-]*)\s*([A-Z0-9][\w\-\/]{1,25})/i,
            /(?:inv[\s.:/-]*(?:no|num|#)?[\s.:/-]*)\s*([A-Z0-9][\w\-\/]{1,25})/i,
            /(?:bill\s*(?:no|number|#)[\s.:/-]*)\s*([A-Z0-9][\w\-\/]{1,25})/i,
        ];
        for (const pat of invNumPatterns) {
            const m = text.match(pat);
            if (m?.[1]) {
                result.invoiceNumber = m[1].trim();
                break;
            }
        }

        // ---- Invoice Date ----
        const datePatterns = [
            /(?:invoice\s*date|inv\.?\s*date|date\s*of\s*invoice|billing\s*date|bill\s*date)[\s.:/-]*\s*(\d{1,2}[\s./-]\d{1,2}[\s./-]\d{2,4})/i,
            /(?:invoice\s*date|inv\.?\s*date|date\s*of\s*invoice|billing\s*date|bill\s*date)[\s.:/-]*\s*(\d{1,2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.,]*\d{2,4})/i,
            /(?:date)[\s.:/-]*\s*(\d{1,2}[\s./-]\d{1,2}[\s./-]\d{2,4})/i,
        ];
        for (const pat of datePatterns) {
            const m = text.match(pat);
            if (m?.[1]) {
                result.invoiceDate = normalizeDate(m[1].trim());
                break;
            }
        }

        // ---- Total Amount ----
        const totalPatterns = [
            /(?:grand\s*total|total\s*amount|amount\s*payable|net\s*payable|total\s*(?:due|inv(?:oice)?))[\s.:₹$Rs]*\s*([0-9,]+\.?\d{0,2})/i,
            /(?:total)[\s.:₹$Rs]*\s*([0-9,]+\.\d{2})/i,
        ];
        for (const pat of totalPatterns) {
            const m = text.match(pat);
            if (m?.[1]) {
                result.totalAmount = parseFloat(m[1].replace(/,/g, ''));
                break;
            }
        }

        // ---- Basic Amount (before taxes) ----
        const basicPatterns = [
            /(?:sub\s*total|basic\s*amount|taxable\s*(?:value|amount)|net\s*amount|amount\s*before\s*tax)[\s.:₹$Rs]*\s*([0-9,]+\.?\d{0,2})/i,
            /(?:subtotal)[\s.:₹$Rs]*\s*([0-9,]+\.?\d{0,2})/i,
        ];
        for (const pat of basicPatterns) {
            const m = text.match(pat);
            if (m?.[1]) {
                result.basicAmount = parseFloat(m[1].replace(/,/g, ''));
                break;
            }
        }

        // ---- Tax Type ----
        if (/igst/i.test(text)) {
            result.taxType = 'IGST';
        } else if (/cgst|sgst/i.test(text)) {
            result.taxType = 'CGST_SGST';
        } else if (/gst/i.test(text)) {
            // generic GST — default to CGST_SGST
            result.taxType = 'CGST_SGST';
        }

        // ---- HSN Code ----
        const hsnPatterns = [
            /(?:hsn|sac)[\s\/:.-]*(?:code)?[\s\/:.-]*(\d{4,8})/i,
            /\b(\d{4,8})\b/,  // fallback: look for 4-8 digit codes in context near "hsn"
        ];
        // try specific pattern first
        const hsnMatch = text.match(hsnPatterns[0]);
        if (hsnMatch?.[1]) {
            result.hsnCode = hsnMatch[1];
        }

    } catch (e) {
        console.error('[OCR] Parse error:', e);
    }

    return result;
}

/**
 * Normalize various date formats to YYYY-MM-DD for HTML date input.
 */
function normalizeDate(dateStr) {
    if (!dateStr) return null;

    try {
        // Try common formats
        // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
        let m = dateStr.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
        if (m) {
            const day = m[1].padStart(2, '0');
            const month = m[2].padStart(2, '0');
            return `${m[3]}-${month}-${day}`;
        }

        // DD/MM/YY
        m = dateStr.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2})$/);
        if (m) {
            const year = parseInt(m[3]) > 50 ? `19${m[3]}` : `20${m[3]}`;
            const day = m[1].padStart(2, '0');
            const month = m[2].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // DD Mon YYYY (e.g. 15 Jan 2024)
        const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        m = dateStr.match(/^(\d{1,2})\s*([a-z]{3})[a-z]*[\s.,]*(\d{4})$/i);
        if (m) {
            const mon = months[m[2].toLowerCase().substring(0, 3)];
            if (mon) {
                return `${m[3]}-${mon}-${m[1].padStart(2, '0')}`;
            }
        }

        // Fallback: try JS Date parser
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
    } catch {
        // ignore parse errors
    }

    return null;
}
