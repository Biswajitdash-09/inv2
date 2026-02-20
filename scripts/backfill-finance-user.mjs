/**
 * scripts/backfill-finance-user.mjs
 * One-time script: assign the correct Finance User on all invoices
 * that have a PM but no assignedFinanceUser, by looking up PM.managedBy.
 *
 * Run: node scripts/backfill-finance-user.mjs
 */

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://invoice:invoice1234@test.a0dvdj9.mongodb.net/invoice_tracker_db?retryWrites=true&w=majority&appName=test';

// Inline minimal schemas (avoid Next.js import issues)
const UserSchema = new mongoose.Schema({
    id: String,
    name: String,
    role: String,
    managedBy: String,
    email: String
});

const InvoiceSchema = new mongoose.Schema({
    id: String,
    invoiceNumber: String,
    assignedPM: String,
    assignedFinanceUser: String,
    status: String
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

// Normalize role — matches the app's logic
function normalizeRole(role) {
    if (!role) return '';
    const r = role.toLowerCase().replace(/[-_\s]/g, '');
    if (['financeuser'].includes(r)) return 'Finance User';
    if (['projectmanager', 'pm'].includes(r)) return 'PM';
    if (r === 'admin') return 'Admin';
    if (r === 'vendor') return 'Vendor';
    return role;
}

async function run() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.\n');

    // Find all invoices missing assignedFinanceUser but having a PM
    const invoicesToFix = await Invoice.find({
        assignedPM: { $nin: [null, ''] },
        $or: [
            { assignedFinanceUser: null },
            { assignedFinanceUser: { $exists: false } },
            { assignedFinanceUser: '' }
        ]
    }).select('id invoiceNumber assignedPM assignedFinanceUser status');

    console.log(`Found ${invoicesToFix.length} invoices to backfill.\n`);

    // Cache PM → FU to reduce DB hits
    const pmFuCache = {};
    let patched = 0;
    let skipped = 0;

    for (const inv of invoicesToFix) {
        if (!(inv.assignedPM in pmFuCache)) {
            const pm = await User.findOne({ id: inv.assignedPM }).select('id name managedBy role');
            let fuUser = null;
            if (pm?.managedBy) {
                const manager = await User.findOne({ id: pm.managedBy }).select('id name role');
                if (manager && normalizeRole(manager.role) === 'Finance User') {
                    fuUser = manager;
                }
            }
            pmFuCache[inv.assignedPM] = fuUser;
        }

        const fuUser = pmFuCache[inv.assignedPM];

        if (fuUser) {
            await Invoice.findOneAndUpdate(
                { id: inv.id },
                { $set: { assignedFinanceUser: fuUser.id } }
            );
            console.log(`  ✅ ${inv.invoiceNumber || inv.id} → assigned to ${fuUser.name} (${fuUser.id})`);
            patched++;
        } else {
            console.log(`  ⚠️  ${inv.invoiceNumber || inv.id} — PM ${inv.assignedPM} has no Finance User in hierarchy, skipped`);
            skipped++;
        }
    }

    console.log(`\n✅ Done. Patched: ${patched}, Skipped: ${skipped}`);
    await mongoose.disconnect();
}

run().catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
});
