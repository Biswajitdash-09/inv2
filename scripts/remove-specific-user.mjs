import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
}

const UserSchema = new mongoose.Schema({
    id: String,
    name: String,
    email: { type: String, lowercase: true },
    role: String,
    vendorId: String
}, { collection: 'users' });

const VendorSchema = new mongoose.Schema({
    id: String,
    name: String,
    email: String,
    linkedUserId: String
}, { collection: 'vendors' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);

async function removeUserCompletely() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'administrator@company.com';

        // Find user by email (even though we might have deleted it, let's check vendors by email too)
        const vendorByEmail = await Vendor.findOne({ email: email.toLowerCase() });
        const vendorByName = await Vendor.findOne({ name: 'Admin User' });

        if (vendorByEmail) {
            console.log('Found Vendor record by email:', vendorByEmail);
            const res = await Vendor.deleteOne({ _id: vendorByEmail._id });
            console.log('Vendor deletion result:', res);
        } else if (vendorByName) {
            console.log('Found Vendor record by name:', vendorByName);
            const res = await Vendor.deleteOne({ _id: vendorByName._id });
            console.log('Vendor deletion result:', res);
        } else {
            console.log('No Vendor record found for administrator@company.com or "Admin User"');
        }

        // Final check on all users to be absolutely sure
        const usersLeft = await User.countDocuments({ email: email.toLowerCase() });
        console.log(`Users left with this email: ${usersLeft}`);

        await mongoose.disconnect();
        console.log('Disconnected');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

removeUserCompletely();
