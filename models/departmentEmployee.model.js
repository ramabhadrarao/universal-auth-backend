const mongoose = require('mongoose');

const DepartmentEmployeeSchema = new mongoose.Schema({
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    maxlength: [100, 'Role cannot be more than 100 characters']
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  target: {
    type: Number
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('DepartmentEmployee', DepartmentEmployeeSchema);