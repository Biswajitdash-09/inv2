/**
 * Matching Engine
 * Handles the logic for 3-Way Matching (Invoice vs PO vs GR)
 */
import { integration } from './integration.js';

export const matchingEngine = {
    /**
     * Perform 3-Way Match
     * @param {Object} invoice 
     * @returns {Promise<Object>} Match Result
     */
    performThreeWayMatch: async (invoice) => {
        const results = {
            status: 'MATCHED', // MATCHED, DISCREPANCY, ERROR
            details: [],
            discrepancies: [],
            poData: null,
            grData: null
        };

        try {
            if (!invoice.poNumber) {
                results.status = 'DISCREPANCY';
                results.discrepancies.push("Missing PO Number on Invoice");
                return results;
            }

            // 1. Fetch External Data
            const [po, gr] = await Promise.all([
                integration.fetchPurchaseOrder(invoice.poNumber),
                integration.fetchGoodsReceipt(invoice.poNumber)
            ]);

            results.poData = po;
            results.grData = gr;

            if (!po) {
                results.status = 'DISCREPANCY';
                results.discrepancies.push(`PO ${invoice.poNumber} not found in SAP`);
                return results;
            }

            if (!gr) {
                results.status = 'DISCREPANCY';
                results.discrepancies.push(`Goods Receipt not found for PO ${invoice.poNumber}`);
                return results;
            }

            // 2. Header Level Checks
            const invTotal = parseFloat(invoice.amount || 0);
            const poTotal = po.totalAmount;

            // Tolerance Check (e.g., 5% or fixed amount)
            const diff = Math.abs(invTotal - poTotal);
            if (diff > 0.01 && (diff / poTotal) > 0.05) {
                results.status = 'DISCREPANCY';
                results.discrepancies.push(`Total Amount Mismatch: Invoice ${invTotal} vs PO ${poTotal}`);
            }

            // 3. Line Item Matching (Simplified for MVP)
            // Assumes invoice items map sequentially or by description to PO items
            // In a real system, we'd match by Line Number if available, or fuzzy match description

            const invoiceItems = invoice.items || invoice.lineItems || [];

            if (invoiceItems.length === 0) {
                // If no line items extracted, rely on header match only, but flag warning
                if (!invoice.amount) {
                    results.status = 'DISCREPANCY';
                    results.discrepancies.push("No invoice lines or amount extracted");
                }
            } else {
                invoiceItems.forEach((invItem, index) => {
                    const poItem = po.items[index];
                    const grItem = gr.items[index]; // Assuming simple 1:1 mapping for demo

                    if (!poItem) {
                        results.discrepancies.push(`Extra line item on invoice: ${invItem.description}`);
                        results.status = 'DISCREPANCY';
                        return;
                    }

                    // Price Check
                    if (Math.abs(invItem.unitPrice - poItem.unitPrice) > 0.01) {
                        results.discrepancies.push(`Price mismatch on line ${index + 1}: ${invItem.unitPrice} vs ${poItem.unitPrice}`);
                        results.status = 'DISCREPANCY';
                    }

                    // Quantity Check vs GR
                    if (grItem && invItem.quantity > grItem.accepted) {
                        results.discrepancies.push(`Quantity mismatch on line ${index + 1}: Invoiced ${invItem.quantity} > Received ${grItem.accepted}`);
                        results.status = 'DISCREPANCY';
                    }
                });
            }

            return results;

        } catch (error) {
            console.error("Matching Error:", error);
            results.status = 'ERROR';
            results.discrepancies.push("System error during matching process");
            return results;
        }
    }
};
