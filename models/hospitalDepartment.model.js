// models/hospitalDepartment.model.js
const mongoose = require('mongoose');

const HospitalDepartmentSchema = new mongoose.Schema({
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  departmentName: {
    type: String,
    required: [true, 'Department name is required'],
    maxlength: [100, 'Department name cannot be more than 100 characters']
  },
  deptHead: {
    type: String,
    maxlength: [100, 'Department head name cannot be more than 100 characters']
  },
  phone: {
    type: String,
    maxlength: [20, 'Phone number cannot be more than 20 characters']
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  locationWithinHospital: {
    type: String,
    maxlength: [100, 'Location within hospital cannot be more than 100 characters']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HospitalDepartment', HospitalDepartmentSchema);