import mongoose from 'mongoose';

/**
 * Notification log – emails and reminders sent by the system.
 * Mirrors the legacy SQL notifications table; used for audit and UI display.
 */
const NotificationSchema = new mongoose.Schema({
    recipient_email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String },
    status: { type: String, enum: ['SENT', 'FAILED'], default: 'SENT' },
    sent_at: { type: Date, default: Date.now },
    related_entity_id: { type: String }, // e.g. Invoice ID
    notification_type: { type: String }, // e.g. 'RECEIVED', 'REJECTED', 'PAID', 'PENDING_APPROVAL', 'REMINDER'
});

NotificationSchema.index({ related_entity_id: 1 });
NotificationSchema.index({ sent_at: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
