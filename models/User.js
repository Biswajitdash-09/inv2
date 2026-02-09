import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Keeping custom ID for consistency
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true },
    assignedProjects: { type: [String], default: [] }, // For Project Managers
    vendorId: { type: String }, // For Vendors (optional linkage)
    // New RBAC fields
    isActive: { type: Boolean, default: true }, // For user deactivation
    permissions: { type: [String], default: [] }, // Granular permissions override
    lastLogin: { type: Date },
    profileImage: { type: String },
    department: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes for efficient queries (email already indexed via unique: true)
UserSchema.index({ role: 1, isActive: 1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);

