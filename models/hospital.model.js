// models/hospital.model.js
const mongoose = require('mongoose');

const HospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true,
    maxlength: [255, 'Name cannot be more than 255 characters']
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    maxlength: [20, 'Phone number cannot be more than 20 characters']
  },
  address: {
    type: String
  },
  location: {
    type: String,
    maxlength: [100, 'Location cannot be more than 100 characters']
  },
  city: {
    type: String,
    maxlength: [100, 'City cannot be more than 100 characters']
  },
  state: {
    type: String,
    maxlength: [100, 'State cannot be more than 100 characters']
  },
  pincode: {
    type: String,
    maxlength: [10, 'Pincode cannot be more than 10 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create indexes for faster searching
HospitalSchema.index({ name: 1 });
HospitalSchema.index({ city: 1 });
HospitalSchema.index({ state: 1 });
HospitalSchema.index({ isActive: 1 });

module.exports = mongoose.model('Hospital', HospitalSchema);