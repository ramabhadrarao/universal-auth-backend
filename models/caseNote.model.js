// models/caseNote.model.js
const mongoose = require('mongoose');

const CaseNoteSchema = new mongoose.Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  noteText: {
    type: String,
    required: [true, 'Note text is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create indexes
CaseNoteSchema.index({ case: 1 });

module.exports = mongoose.model('CaseNote', CaseNoteSchema);