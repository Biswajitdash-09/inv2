
import { matchingEngine } from '../lib/matching.js';
import { integration } from '../lib/integration.js';

// Mock Data
const mockInvoice = {
    id: "INV-TEST-001",
    poNumber: "PO-2026-001", // This triggers the mock PO in integration.js
    amount: 6200.00,
    items: [
        { description: "High-Performance Server Blade", quantity: 2, unitPrice: 2500.00 },
        { description: "Network Switch 48-Port", quantity: 1, unitPrice: 1200.00 }
    ]
};

const mockInvoiceDiscrepancy = {
    id: "INV-TEST-002",
    poNumber: "PO-2026-001",
    amount: 7000.00, // Wrong Amount
    items: [
        { description: "High-Performance Server Blade", quantity: 2, unitPrice: 2900.00 }, // Wrong Price
        { description: "Network Switch 48-Port", quantity: 1, unitPrice: 1200.00 }
    ]
};

async function verify() {
    console.log("--- Starting Verification ---");

    try {
        // Test 1: Perfect Match
        console.log("\nTest 1: Perfect Match");
        const result1 = await matchingEngine.performThreeWayMatch(mockInvoice);
        console.log("Status:", result1.status);
        console.log("Discrepancies:", result1.discrepancies);

        if (result1.status === 'MATCHED') {
            console.log("✅ Match Successful");
        } else {
            console.error("❌ Match Failed");
        }

        // Test 2: Discrepancy
        console.log("\nTest 2: Discrepancy");
        const result2 = await matchingEngine.performThreeWayMatch(mockInvoiceDiscrepancy);
        console.log("Status:", result2.status);
        console.log("Discrepancies:", result2.discrepancies);

        if (result2.status === 'DISCREPANCY' && result2.discrepancies.length > 0) {
            console.log("✅ Discrepancy Detected Correctly");
        } else {
            console.error("❌ Discrepancy Detection Failed");
        }

    } catch (e) {
        console.error("Verification Error:", e);
    }
}

verify();
