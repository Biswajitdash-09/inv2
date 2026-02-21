import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function listVendors() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const VendorSchema = new mongoose.Schema({}, { strict: false, collection: 'vendors' });
        const Vendor = mongoose.model('VendorListFinal', VendorSchema);

        const vendors = await Vendor.find({}).sort({ name: 1 });
        console.log(`Found ${vendors.length} vendors:`);
        vendors.forEach(v => {
            console.log(`- ${v.name} (${v.vendorCode || 'no code'}) ID: ${v.id}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
listVendors();
