import mongoose from 'mongoose';

const DocumentUploadSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    projectId: { type: String },        // Reference to project
    invoiceId: { type: String },        // Optional link to invoice
    type: {
        type: String,
        enum: ['RINGI', 'ANNEX', 'TIMESHEET', 'RATE_CARD', 'INVOICE', 'RFP_COMMERCIAL'],
        required: true
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    mimeType: { type: String },
    fileSize: { type: Number },
    uploadedBy: { type: String, required: true }, // User ID
    metadata: {
        billingMonth: { type: String },
        validated: { type: Boolean, default: false },
        validationNotes: { type: String },
        ringiNumber: { type: String },
        projectName: { type: String }
    },
    status: {
        type: String,
        enum: ['PENDING', 'VALIDATED', 'REJECTED'],
        default: 'PENDING'
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes for efficient queries
DocumentUploadSchema.index({ projectId: 1 });
DocumentUploadSchema.index({ invoiceId: 1 });
DocumentUploadSchema.index({ uploadedBy: 1 });
DocumentUploadSchema.index({ type: 1, status: 1 });

export default mongoose.models.DocumentUpload || mongoose.model('DocumentUpload', DocumentUploadSchema);
