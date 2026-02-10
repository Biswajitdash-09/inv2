import mongoose from 'mongoose';

const OtpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: '0s' } // TTL index: document will be removed after this time
    }
}, { timestamps: true });

// Ensure index exists for expiration
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Force model recompilation in dev to pick up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.Otp) {
    delete mongoose.models.Otp;
}

export default mongoose.models.Otp || mongoose.model('Otp', OtpSchema);
