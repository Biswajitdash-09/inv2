import mongoose from 'mongoose';

const AuditTrailSchema = new mongoose.Schema({
    invoice_id: { type: String, required: true },
    username: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String },
    timestamp: { type: Date, default: Date.now } // Mongoose handles this automatically better
});

export default mongoose.models.AuditTrail || mongoose.model('AuditTrail', AuditTrailSchema);
