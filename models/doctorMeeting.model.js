// models/doctorMeeting.model.js
const mongoose = require('mongoose');

const DoctorMeetingSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  meetingDate: {
    type: Date,
    required: [true, 'Meeting date is required']
  },
  meetingType: {
    type: String,
    required: [true, 'Meeting type is required'],
    maxlength: [50, 'Meeting type cannot be more than 50 characters']
  },
  location: {
    type: String,
    maxlength: [100, 'Location cannot be more than 100 characters']
  },
  discussion: {
    type: String
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

module.exports = mongoose.model('DoctorMeeting', DoctorMeetingSchema);