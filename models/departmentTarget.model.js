const mongoose = require('mongoose');

const DepartmentTargetSchema = new mongoose.Schema({
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  targetType: {
    type: String,
    required: true,
    enum: ['Sales', 'Cases', 'Revenue', 'Other']
  },
  targetValue: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  achievedValue: {
    type: Number,
    default: 0
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true 
});

// Add a virtual for achievement percentage
DepartmentTargetSchema.virtual('achievementPercentage').get(function() {
  return this.targetValue > 0 
    ? Math.round((this.achievedValue / this.targetValue) * 100) 
    : 0;
});

module.exports = mongoose.model('DepartmentTarget', DepartmentTargetSchema);