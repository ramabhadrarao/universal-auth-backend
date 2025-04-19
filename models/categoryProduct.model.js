const mongoose = require('mongoose');

const CategoryProductSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory'
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  displayOrder: Number
}, { timestamps: true });

module.exports = mongoose.model('CategoryProduct', CategoryProductSchema);
