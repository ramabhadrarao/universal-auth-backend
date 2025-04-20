// models/hospitalVisit.model.js
const mongoose = require('mongoose');

const HospitalVisitSchema = new mongoose.Schema({
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  visitor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  visitDate: {
    type: Date,
    required: [true, 'Visit date is required']
  },
  contactMet: {
    type: String,
    maxlength: [100, 'Contact met cannot be more than 100 characters']
  },
  purpose: {
    type: String,
    maxlength: [255, 'Purpose cannot be more than 255 characters']
  },
  outcome: {
    type: String
  },
  followUpDate: {
    type: Date
  },
  followUpAction: {
    type: String
  },
  status: {
    type: String,
    enum: ['Planned', 'Completed', 'Cancelled', 'Rescheduled'],
    default: 'Completed'
  }
}, {
  timestamps: true
});

// Create indexes for quick access
HospitalVisitSchema.index({ hospital: 1 });
HospitalVisitSchema.index({ visitor: 1 });
HospitalVisitSchema.index({ visitDate: 1 });
HospitalVisitSchema.index({ followUpDate: 1 });
HospitalVisitSchema.index({ status: 1 });

module.exports = mongoose.model('HospitalVisit', HospitalVisitSchema);