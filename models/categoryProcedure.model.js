const mongoose = require('mongoose');

const CategoryProcedureSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory'
  },
  procedureName: {
    type: String,
    required: true
  },
  description: String,
  estimatedDurationMinutes: Number,
  complexityLevel: String
}, { timestamps: true });

module.exports = mongoose.model('CategoryProcedure', CategoryProcedureSchema);
