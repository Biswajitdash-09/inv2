import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import fs from 'fs';

async function listVendorsToFile() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const VendorSchema = new mongoose.Schema({}, { strict: false, collection: 'vendors' });
        const Vendor = mongoose.model('VendorListToFileSync', VendorSchema);

        const vendors = await Vendor.find({}).sort({ name: 1 });
        let output = `Found ${vendors.length} vendors:\n`;
        vendors.forEach(v => {
            output += `- ${v.name} (${v.vendorCode || 'no code'}) ID: ${v.id}\n`;
        });
        fs.writeFileSync('clean_vendors_list.txt', output);
    } catch (e) {
        fs.writeFileSync('clean_vendors_list.txt', 'Error: ' + e.message);
    } finally {
        mongoose.disconnect();
    }
}
listVendorsToFile();
