// models/productUsage.model.js
const mongoose = require('mongoose');

const ProductUsageSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    default: 1,
    min: [1, 'Quantity must be at least 1']
  },
  batchNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Batch number cannot be more than 50 characters']
  },
  usedDate: {
    type: Date,
    required: [true, 'Usage date is required']
  },
  dpValue: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  sellingPrice: {
    type: Number,
    min: [0, 'Price cannot be negative']
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
ProductUsageSchema.index({ product: 1 });
ProductUsageSchema.index({ case: 1 });
ProductUsageSchema.index({ usedDate: 1 });

module.exports = mongoose.model('ProductUsage', ProductUsageSchema);