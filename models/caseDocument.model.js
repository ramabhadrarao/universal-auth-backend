// models/caseDocument.model.js
const mongoose = require('mongoose');

const CaseDocumentSchema = new mongoose.Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  documentName: {
    type: String,
    required: [true, 'Document name is required'],
    maxlength: [255, 'Document name cannot be more than 255 characters']
  },
  documentType: {
    type: String,
    maxlength: [100, 'Document type cannot be more than 100 characters']
  },
  filePath: {
    type: String,
    required: [true, 'File path is required'],
    maxlength: [500, 'File path cannot be more than 500 characters']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create indexes
CaseDocumentSchema.index({ case: 1 });

module.exports = mongoose.model('CaseDocument', CaseDocumentSchema);