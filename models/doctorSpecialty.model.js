// models/doctorSpecialty.model.js
const mongoose = require('mongoose');

const DoctorSpecialtySchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  specialtyName: {
    type: String,
    required: [true, 'Specialty name is required'],
    maxlength: [100, 'Specialty name cannot be more than 100 characters']
  },
  expertiseLevel: {
    type: String,
    maxlength: [50, 'Expertise level cannot be more than 50 characters']
  },
  yearsExperience: {
    type: Number,
    min: [0, 'Years of experience cannot be negative']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DoctorSpecialty', DoctorSpecialtySchema);