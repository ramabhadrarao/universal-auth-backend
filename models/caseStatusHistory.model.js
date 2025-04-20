// models/caseStatusHistory.model.js
const mongoose = require('mongoose');

const CaseStatusHistorySchema = new mongoose.Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  previousStatus: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled', 'Pending']
  },
  newStatus: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled', 'Pending'],
    required: true
  },
  notes: {
    type: String
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create indexes
CaseStatusHistorySchema.index({ case: 1 });
CaseStatusHistorySchema.index({ createdAt: 1 });

module.exports = mongoose.model('CaseStatusHistory', CaseStatusHistorySchema);