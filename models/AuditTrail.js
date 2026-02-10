import mongoose from 'mongoose';

const AuditTrailSchema = new mongoose.Schema({
    invoice_id: { type: String },
    username: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String },
    timestamp: { type: Date, default: Date.now } // Mongoose handles this automatically better
});

// Force model recompilation in dev to pick up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.AuditTrail) {
    delete mongoose.models.AuditTrail;
}

export default mongoose.models.AuditTrail || mongoose.model('AuditTrail', AuditTrailSchema);
