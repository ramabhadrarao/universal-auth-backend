// models/doctorHospitalAssociation.model.js
const mongoose = require('mongoose');

const DoctorHospitalAssociationSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  role: {
    type: String,
    maxlength: [100, 'Role cannot be more than 100 characters']
  },
  department: {
    type: String,
    maxlength: [100, 'Department cannot be more than 100 characters']
  },
  schedule: {
    type: String
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create indexes
DoctorHospitalAssociationSchema.index({ doctor: 1, hospital: 1 }, { unique: true });

module.exports = mongoose.model('DoctorHospitalAssociation', DoctorHospitalAssociationSchema);