const mongoose = require('mongoose');

const PrincipleVisitSchema = new mongoose.Schema({
  principle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principle',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  visitDate: {
    type: Date,
    required: [true, 'Visit date is required']
  },
  visitType: {
    type: String,
    required: [true, 'Visit type is required'],
    maxlength: [50, 'Visit type cannot be more than 50 characters']
  },
  location: {
    type: String,
    maxlength: [100, 'Location cannot be more than 100 characters']
  },
  contactsMet: String,
  discussion: String,
  outcome: String,
  followUpDate: Date,
  followUpAction: String,
  status: {
    type: String,
    enum: ['Planned', 'Completed', 'Cancelled', 'Rescheduled'],
    default: 'Completed'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PrincipleVisit', PrincipleVisitSchema);