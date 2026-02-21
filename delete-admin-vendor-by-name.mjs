import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function deleteAdminVendorByName() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const VendorSchema = new mongoose.Schema({}, { strict: false, collection: 'vendors' });
        const Vendor = mongoose.model('VendorDeleteByName', VendorSchema);

        const RateCardSchema = new mongoose.Schema({}, { strict: false, collection: 'ratecards' });
        const RateCard = mongoose.model('RateCardDeleteByName', RateCardSchema);

        const vendorMatch = { name: /Admin User/i };
        const adminVendor = await Vendor.findOne(vendorMatch);

        if (adminVendor) {
            console.log(`Deleting Vendor: ${adminVendor.name} with ID: ${adminVendor.id || 'N/A'}`);
            const vendorId = adminVendor.id;

            const vendorResult = await Vendor.deleteOne(vendorMatch);
            console.log('Vendor delete result:', vendorResult);

            if (vendorId) {
                const rateCardResult = await RateCard.deleteMany({ vendorId: vendorId });
                console.log('RateCards delete result:', rateCardResult);
            }
        } else {
            console.log('Admin Vendor not found for deletion');
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
deleteAdminVendorByName();
