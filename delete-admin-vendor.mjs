import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function deleteAdminVendor() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const VendorSchema = new mongoose.Schema({}, { strict: false, collection: 'vendors' });
        const Vendor = mongoose.model('VendorDelete', VendorSchema);

        const RateCardSchema = new mongoose.Schema({}, { strict: false, collection: 'ratecards' });
        const RateCard = mongoose.model('RateCardDelete', RateCardSchema);

        const adminVendor = await Vendor.findOne({ name: /Admin User/i });
        if (adminVendor) {
            const vendorId = adminVendor.id;
            console.log(`Deleting Vendor: ${adminVendor.name} (${vendorId})`);

            const vendorResult = await Vendor.deleteOne({ id: vendorId });
            console.log('Vendor delete result:', vendorResult);

            const rateCardResult = await RateCard.deleteMany({ vendorId: vendorId });
            console.log('RateCards delete result:', rateCardResult);
        } else {
            console.log('Admin Vendor not found for deletion');
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
deleteAdminVendor();
