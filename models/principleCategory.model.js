const mongoose = require('mongoose');

const PrincipleCategorySchema = new mongoose.Schema({
  principle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principle',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  terms: String
}, {
  timestamps: true
});

module.exports = mongoose.model('PrincipleCategory', PrincipleCategorySchema);