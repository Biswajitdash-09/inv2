import mongoose from 'mongoose';

/**
 * Message Schema for PM-Vendor communication
 * Enables real-time messaging between PMs and Vendors for invoice-related discussions
 */
const MessageSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    // Context
    invoiceId: { type: String },
    projectId: { type: String },
    // Participants
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    recipientId: { type: String, required: true },
    recipientName: { type: String },
    // Message content
    subject: { type: String },
    content: { type: String, required: true },
    messageType: {
        type: String,
        enum: ['GENERAL', 'INFO_REQUEST', 'CLARIFICATION', 'DOCUMENT_REQUEST', 'APPROVAL_NOTIFICATION'],
        default: 'GENERAL'
    },
    // Status
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    // Thread support
    parentMessageId: { type: String },
    threadId: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes for efficient queries
MessageSchema.index({ senderId: 1, created_at: -1 });
MessageSchema.index({ recipientId: 1, isRead: 1 });
MessageSchema.index({ invoiceId: 1 });
MessageSchema.index({ threadId: 1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
