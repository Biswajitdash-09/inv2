import mongoose from 'mongoose';

const ApprovalSchema = new mongoose.Schema({
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'INFO_REQUESTED'], default: 'PENDING' },
    approvedBy: { type: String },
    approvedByRole: { type: String },
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
    type: { type: String },
    fileName: { type: String }  // Original filename for file-type detection
}, { _id: false });

// Enhanced audit trail for comprehensive workflow tracking
const AuditLogSchema = new mongoose.Schema({
    action: { type: String, required: true },           // Action performed (e.g., 'submitted', 'approved', 'rejected')
    actor: { type: String, required: true },            // Full name of person who performed the action
    actorId: { type: String, required: true },          // User ID of person who performed the action
    actorRole: { type: String, required: true },        // Role of person (Vendor, PM, Finance User, Admin)
    timestamp: { type: Date, default: Date.now },       // When the action occurred
    previousStatus: { type: String },                    // Invoice status before this action
    newStatus: { type: String },                         // Invoice status after this action
    notes: { type: String },                             // Optional notes/comments
    ipAddress: { type: String },                         // IP address of requestor
    userAgent: { type: String }                          // Browser/client information
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    vendorName: { type: String, required: true },
    submittedByUserId: { type: String }, // User id of submitter (vendor) - reliable filter for vendor list
    vendorId: { type: String }, // Vendor record id — uniquely identifies which vendor uploaded (for admin/PM display)
    originalName: { type: String },
    receivedAt: { type: Date },
    invoiceNumber: { type: String },
    date: { type: String },
    invoiceDate: { type: String }, // Separate invoice date field
    amount: { type: Number },
    basicAmount: { type: Number }, // Amount before taxes
    taxType: { type: String, enum: ['CGST_SGST', 'IGST', ''] }, // Tax type dropdown
    hsnCode: { type: String }, // HSN Code
    // Invoice workflow status - follows PRD workflow: Submitted → PM → Finance
    status: {
        type: String,
        required: true,
        enum: [
            'Submitted',                    // Initial state when vendor submits
            'Pending PM Approval',          // Awaiting PM review
            'PM Approved',                  // PM approved, ready for Finance
            'PM Rejected',                  // PM rejected
            'More Info Needed',             // PM requests additional info
            'Pending Finance Review',       // Awaiting Finance review after PM approval
            'Finance Approved',             // Finance approved - final state
            'Finance Rejected'              // Finance rejected - final state
        ],
        default: 'Submitted'
    },
    originatorRole: {
        type: String,
        enum: ['Admin', 'PM', 'Finance User', 'Vendor'],
        default: 'Vendor'
    }, // Role that initiated the invoice
    category: { type: String },
    dueDate: { type: String },
    costCenter: { type: String },
    accountCode: { type: String },
    currency: { type: String, default: 'INR' },
    fileUrl: { type: String },
    poNumber: { type: String },
    project: { type: String },
    matching: { type: mongoose.Schema.Types.Mixed },
    // Detailed Line Items for Rate Validation
    lineItems: [{
        role: { type: String, required: true }, // e.g. "Developer"
        experienceRange: { type: String, required: true }, // e.g. "3-5 Years"
        description: { type: String }, // Optional details
        quantity: { type: Number, required: true }, // Hours or Days
        unit: { type: String, required: true }, // "HOUR", "DAY"
        rate: { type: Number, required: true }, // Submitted Rate
        amount: { type: Number, required: true }, // Calculated (Qty * Rate)
        status: { type: String, enum: ['MATCH', 'MISMATCH', 'MANUAL'], default: 'MATCH' } // System validation status
    }],
    // New RBAC fields
    assignedPM: { type: String },  // PM user ID for this invoice - MANDATORY for workflow
    assignedFinanceUser: { type: String }, // Will be auto-assigned by Finance when reviewing
    financeApproval: { type: ApprovalSchema, default: () => ({}) },
    pmApproval: { type: ApprovalSchema, default: () => ({}) },
    adminApproval: { type: ApprovalSchema, default: () => ({}) },
    hilReview: { type: HILReviewSchema, default: () => ({}) },
    documents: [InvoiceDocumentSchema],
    auditTrail: [AuditLogSchema],  // Comprehensive audit trail for all workflow actions
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes for efficient queries
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ assignedPM: 1 });
InvoiceSchema.index({ assignedFinanceUser: 1 });
InvoiceSchema.index({ submittedByUserId: 1 });
InvoiceSchema.index({ project: 1 });
InvoiceSchema.index({ 'financeApproval.status': 1 });
InvoiceSchema.index({ 'pmApproval.status': 1 });
InvoiceSchema.index({ 'adminApproval.status': 1 });
InvoiceSchema.index({ 'hilReview.status': 1 });

// Index for efficient audit trail queries
InvoiceSchema.index({ 'auditTrail.timestamp': -1 });
InvoiceSchema.index({ 'auditTrail.actorId': 1 });

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

