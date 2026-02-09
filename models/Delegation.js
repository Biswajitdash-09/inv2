import mongoose from 'mongoose';

const DelegationSchema = new mongoose.Schema({
    delegate_from: { type: String, required: true },
    delegate_to: { type: String, required: true },
    active: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default mongoose.models.Delegation || mongoose.model('Delegation', DelegationSchema);
