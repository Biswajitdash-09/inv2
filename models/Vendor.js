import mongoose from 'mongoose';

const BankDetailsSchema = new mongoose.Schema({
    accountName: { type: String },
    accountNumber: { type: String },
    bankName: { type: String },
    ifscCode: { type: String }
}, { _id: false });

const PerformanceMetricsSchema = new mongoose.Schema({
    totalInvoices: { type: Number, default: 0 },
    onTimePayments: { type: Number, default: 0 },
    rejectionRate: { type: Number, default: 0 }
}, { _id: false });

const VendorSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    tax_id: { type: String },
    // New RBAC fields
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    linkedUserId: { type: String },  // Link to vendor user account
    bankDetails: { type: BankDetailsSchema, default: () => ({}) },
    performanceMetrics: { type: PerformanceMetricsSchema, default: () => ({}) },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes for efficient queries
VendorSchema.index({ status: 1 });
VendorSchema.index({ linkedUserId: 1 });

export default mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);

