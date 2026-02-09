import mongoose from 'mongoose';

const AnnexureSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    annexureNumber: { type: String },
    poId: { type: String, required: true },
    originalAmount: { type: Number },
    approvedAmount: { type: Number },
    description: { type: String },
    status: { type: String, default: 'APPROVED' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default mongoose.models.Annexure || mongoose.model('Annexure', AnnexureSchema);
