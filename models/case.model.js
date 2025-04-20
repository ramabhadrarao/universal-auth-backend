// models/case.model.js
const mongoose = require('mongoose');

const CaseSchema = new mongoose.Schema({
  caseNumber: {
    type: String,
    unique: true,
    required: [true, 'Case number is required']
  },
  patientName: {
    type: String,
    required: [true, 'Patient name is required'],
    maxlength: [100, 'Patient name cannot be more than 100 characters']
  },
  patientAge: {
    type: Number,
    min: [0, 'Age cannot be negative']
  },
  patientGender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  surgeryDate: {
    type: Date,
    required: [true, 'Surgery date is required']
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: [true, 'Hospital is required']
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor is required']
  },
  principle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principle',
    required: [true, 'Principle is required']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory'
  },
  dpValue: {
    type: Number,
    min: [0, 'DP value cannot be negative']
  },
  sellingPrice: {
    type: Number,
    min: [0, 'Selling price cannot be negative']
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled', 'Pending'],
    default: 'Active'
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for profit
CaseSchema.virtual('profit').get(function() {
  if (this.sellingPrice && this.dpValue) {
    return this.sellingPrice - this.dpValue;
  }
  return 0;
});

// Create indexes for faster searching
CaseSchema.index({ caseNumber: 1 });
CaseSchema.index({ surgeryDate: 1 });
CaseSchema.index({ hospital: 1 });
CaseSchema.index({ doctor: 1 });
CaseSchema.index({ principle: 1 });
CaseSchema.index({ category: 1 });
CaseSchema.index({ status: 1 });

module.exports = mongoose.model('Case', CaseSchema);