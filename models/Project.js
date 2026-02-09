import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    ringiNumber: { type: String },
    description: { type: String },
    status: {
        type: String,
        enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'],
        default: 'ACTIVE'
    },
    assignedPMs: [{ type: String }],  // Array of user IDs
    vendorIds: [{ type: String }],     // Associated vendors
    billingMonth: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes for efficient queries
ProjectSchema.index({ assignedPMs: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ ringiNumber: 1 });

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
