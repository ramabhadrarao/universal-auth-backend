const mongoose = require('mongoose');

const PrincipleAgreementSchema = new mongoose.Schema({
  principle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principle',
    required: true
  },
  agreementType: {
    type: String,
    required: [true, 'Agreement type is required'],
    maxlength: [100, 'Agreement type cannot be more than 100 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: Date,
  terms: String,
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  paymentTerms: {
    type: String,
    maxlength: [100, 'Payment terms cannot be more than 100 characters']
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Cancelled', 'Pending'],
    default: 'Active'
  },
  documentPath: {
    type: String,
    maxlength: [500, 'Document path cannot be more than 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PrincipleAgreement', PrincipleAgreementSchema);