import mongoose from 'mongoose';

const POItemSchema = new mongoose.Schema({
    description: String,
    quantity: Number,
    unitPrice: Number,
    amount: Number,
    glAccount: String
});

const PurchaseOrderSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    poNumber: { type: String, required: true, unique: true },
    vendorId: { type: String, required: true },
    date: { type: String },
    totalAmount: { type: Number },
    currency: { type: String, default: 'INR' },
    status: { type: String, default: 'OPEN' },
    items: [POItemSchema]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);
