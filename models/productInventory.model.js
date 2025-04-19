// models/productInventory.model.js
const mongoose = require('mongoose');

const ProductInventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  batchNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Batch number cannot be more than 50 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot be more than 100 characters']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  dpValue: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  expiryDate: {
    type: Date
  },
  receivedDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Available', 'Reserved', 'Used', 'Expired', 'Damaged'],
    default: 'Available'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create indexes
ProductInventorySchema.index({ product: 1 });
ProductInventorySchema.index({ batchNumber: 1 });
ProductInventorySchema.index({ location: 1 });
ProductInventorySchema.index({ expiryDate: 1 });
ProductInventorySchema.index({ status: 1 });

module.exports = mongoose.model('ProductInventory', ProductInventorySchema);