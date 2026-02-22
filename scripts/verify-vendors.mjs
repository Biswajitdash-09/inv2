import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const VendorSchema = new mongoose.Schema({
    id: String,
    name: String,
    email: String
}, { collection: 'vendors' });

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);

async function verifyVendors() {
    try {
        await mongoose.connect(MONGODB_URI);
        const allVendors = await Vendor.find({});
        console.log('--- ALL VENDORS ---');
        allVendors.forEach(v => console.log(`- ${v.name} (${v.email})`));
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

verifyVendors();
