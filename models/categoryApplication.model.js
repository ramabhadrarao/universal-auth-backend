// models/categoryApplication.model.js
const mongoose = require('mongoose');

const CategoryApplicationSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory'
  },
  applicationName: {
    type: String,
    required: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CategoryApplication', CategoryApplicationSchema);