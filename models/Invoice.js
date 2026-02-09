import mongoose from 'mongoose';

const ApprovalSchema = new mongoose.Schema({
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'INFO_REQUESTED'], default: 'PENDING' },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    notes: { type: String }
}, { _id: false });

const HILReviewSchema = new mongoose.Schema({
    status: { type: String, enum: ['PENDING', 'REVIEWED', 'FLAGGED'], default: 'PENDING' },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    confidence: { type: Number },
    corrections: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const InvoiceDocumentSchema = new mongoose.Schema({
    documentId: { type: String },
    type: { type: String }
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    vendorName: { type: String, required: true },
    submittedByUserId: { type: String }, // User id of submitter (vendor) - reliable filter for vendor list
    originalName: { type: String },
    receivedAt: { type: Date },
    invoiceNumber: { type: String },
    date: { type: String },
    amount: { type: Number },
    status: { type: String, required: true },
    category: { type: String },
    dueDate: { type: String },
    costCenter: { type: String },
    accountCode: { type: String },
    currency: { type: String, default: 'INR' },
    fileUrl: { type: String },
    poNumber: { type: String },
    project: { type: String },
    matching: { type: mongoose.Schema.Types.Mixed },
    // New RBAC fields
    assignedPM: { type: String },  // PM user ID for this invoice
    financeApproval: { type: ApprovalSchema, default: () => ({}) },
    pmApproval: { type: ApprovalSchema, default: () => ({}) },
    hilReview: { type: HILReviewSchema, default: () => ({}) },
    documents: [InvoiceDocumentSchema],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes for efficient queries
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ assignedPM: 1 });
InvoiceSchema.index({ submittedByUserId: 1 });
InvoiceSchema.index({ project: 1 });
InvoiceSchema.index({ 'financeApproval.status': 1 });
InvoiceSchema.index({ 'pmApproval.status': 1 });
InvoiceSchema.index({ 'hilReview.status': 1 });

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

