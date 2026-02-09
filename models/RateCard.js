import mongoose from 'mongoose';

const RateItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    unit: {
        type: String,
        enum: ['HOUR', 'DAY', 'FIXED', 'MONTHLY'],
        required: true
    },
    rate: { type: Number, required: true },
    currency: { type: String, default: 'INR' }
}, { _id: false });

const RateCardSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    vendorId: { type: String, required: true },
    projectId: { type: String },  // Optional project-specific rate card
    name: { type: String, required: true },
    rates: [RateItemSchema],
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    status: {
        type: String,
        enum: ['ACTIVE', 'EXPIRED', 'DRAFT'],
        default: 'ACTIVE'
    },
    createdBy: { type: String, required: true }, // Admin user ID
    notes: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes for efficient queries
RateCardSchema.index({ vendorId: 1, status: 1 });
RateCardSchema.index({ projectId: 1 });
RateCardSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

export default mongoose.models.RateCard || mongoose.model('RateCard', RateCardSchema);
