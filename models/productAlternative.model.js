// models/productAlternative.model.js
const mongoose = require('mongoose');

const ProductAlternativeSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  alternativeProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  compatibilityLevel: {
    type: String,
    enum: ['Full', 'Partial', 'Emergency Only'],
    default: 'Full'
  },
  priceDifference: {
    type: Number,
    default: 0
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Create indexes
ProductAlternativeSchema.index({ product: 1 });
ProductAlternativeSchema.index({ alternativeProduct: 1 });

// Prevent duplicate alternative product entries
ProductAlternativeSchema.index(
  { product: 1, alternativeProduct: 1 },
  { unique: true }
);

module.exports = mongoose.model('ProductAlternative', ProductAlternativeSchema);