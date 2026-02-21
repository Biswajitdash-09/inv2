import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

// Connect to MongoDB
async function test() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        console.log('Connecting to', MONGODB_URI ? 'URI found' : 'URI missing');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const VendorSchema = new mongoose.Schema({}, { strict: false });
        const Vendor = mongoose.model('Vendor', VendorSchema);

        const RateCardSchema = new mongoose.Schema({}, { strict: false });
        const RateCard = mongoose.model('RateCard', RateCardSchema);

        const vendors = await Vendor.find({}).limit(5);
        console.log('Vendors:', vendors.length);

        const rateCards = await RateCard.find({}).limit(5);
        console.log('RateCards:', rateCards.length);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        mongoose.disconnect();
    }
}
test();
