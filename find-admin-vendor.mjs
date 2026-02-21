import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function findAdminVendor() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const VendorSchema = new mongoose.Schema({}, { strict: false, collection: 'vendors' });
        const Vendor = mongoose.model('VendorLookup', VendorSchema);

        const adminVendor = await Vendor.findOne({ name: /Admin User/i });
        if (adminVendor) {
            console.log('Found Admin Vendor:', JSON.stringify(adminVendor, null, 2));
        } else {
            console.log('Admin Vendor not found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
findAdminVendor();
