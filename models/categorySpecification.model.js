const mongoose = require('mongoose');

const CategorySpecificationSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory'
  },
  specName: {
    type: String,
    required: true
  },
  specType: {
    type: String,
    enum: ['text', 'number', 'boolean', 'enum'],
    required: true
  },
  specUnit: String,
  specOptions: String, // Comma-separated string (for enums)
  isRequired: {
    type: Boolean,
    default: false
  },
  displayOrder: Number
}, { timestamps: true });

module.exports = mongoose.model('CategorySpecification', CategorySpecificationSchema);
