// models/productInventoryTransaction.model.js
const mongoose = require('mongoose');

const ProductInventoryTransactionSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  transactionType: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: [
      'Initial Stock', 
      'Stock Increase', 
      'Stock Decrease', 
      'Transfer', 
      'Used', 
      'Expired', 
      'Damaged',
      'Returned'
    ]
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  batchNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Batch number cannot be more than 50 characters']
  },
  locationFrom: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot be more than 100 characters']
  },
  locationTo: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot be more than 100 characters']
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  referenceType: {
    type: String,
    enum: ['case', 'transfer', 'adjustment', 'receipt']
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create indexes
ProductInventoryTransactionSchema.index({ product: 1 });
ProductInventoryTransactionSchema.index({ transactionType: 1 });
ProductInventoryTransactionSchema.index({ createdAt: 1 });
ProductInventoryTransactionSchema.index({ referenceId: 1, referenceType: 1 });

module.exports = mongoose.model('ProductInventoryTransaction', ProductInventoryTransactionSchema);