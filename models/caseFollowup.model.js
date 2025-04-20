// models/caseFollowup.model.js
const mongoose = require('mongoose');

const CaseFollowupSchema = new mongoose.Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  followupDate: {
    type: Date,
    required: [true, 'Follow-up date is required']
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create indexes
CaseFollowupSchema.index({ case: 1 });
CaseFollowupSchema.index({ followupDate: 1 });
CaseFollowupSchema.index({ status: 1 });

module.exports = mongoose.model('CaseFollowup', CaseFollowupSchema);