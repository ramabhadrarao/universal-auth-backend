// models/caseProduct.model.js
const mongoose = require('mongoose');

const CaseProductSchema = new mongoose.Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    default: 1,
    min: [1, 'Quantity must be at least 1']
  },
  unit_price: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  dp_value: {
    type: Number,
    required: [true, 'DP value is required'],
    min: [0, 'DP value cannot be negative']
  },
  total_amount: {
    type: Number,
    min: [0, 'Total amount cannot be negative']
  },
  batch_number: {
    type: String,
    maxlength: [50, 'Batch number cannot be more than 50 characters']
  },
  used_from_inventory: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for profit per product
CaseProductSchema.virtual('profit').get(function() {
  if (this.unit_price && this.dp_value && this.quantity) {
    return (this.unit_price - this.dp_value) * this.quantity;
  }
  return 0;
});

// Pre-save hook to calculate total amount
CaseProductSchema.pre('save', function(next) {
  if (this.quantity && this.unit_price) {
    this.total_amount = this.quantity * this.unit_price;
  }
  next();
});

// Create indexes
CaseProductSchema.index({ case: 1 });
CaseProductSchema.index({ product: 1 });

module.exports = mongoose.model('CaseProduct', CaseProductSchema);