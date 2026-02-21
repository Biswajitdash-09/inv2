import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function logSampleData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Test Vendor
        const VendorSchema = new mongoose.Schema({}, { strict: false, collection: 'vendors' });
        const VendorCheck = mongoose.model('VendorCheck', VendorSchema);
        const vendors = await VendorCheck.find({}).limit(2);
        console.log('--- Vendors ---');
        console.log(JSON.stringify(vendors, null, 2));

        // Test RateCard
        const RateCardSchema = new mongoose.Schema({}, { strict: false, collection: 'ratecards' });
        const RateCardCheck = mongoose.model('RateCardCheck', RateCardSchema);
        const ratecards = await RateCardCheck.find({}).limit(2);
        console.log('\n--- RateCards ---');
        console.log(JSON.stringify(ratecards, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
logSampleData();
