const mongoose = require('mongoose');

const PrincipleDocumentSchema = new mongoose.Schema({
  principle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principle',
    required: true
  },
  documentType: {
    type: String,
    required: [true, 'Document type is required'],
    maxlength: [50, 'Document type cannot be more than 50 characters']
  },
  documentName: {
    type: String,
    required: [true, 'Document name is required'],
    maxlength: [255, 'Document name cannot be more than 255 characters']
  },
  filePath: {
    type: String,
    required: [true, 'File path is required'],
    maxlength: [500, 'File path cannot be more than 500 characters']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PrincipleDocument', PrincipleDocumentSchema);