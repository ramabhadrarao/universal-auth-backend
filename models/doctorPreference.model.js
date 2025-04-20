// models/doctorPreference.model.js
const mongoose = require('mongoose');

const DoctorPreferenceSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
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
    ref: 'Product'
  },
  preferenceNotes: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DoctorPreference', DoctorPreferenceSchema);