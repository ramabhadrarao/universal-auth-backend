const mongoose = require('mongoose');

const PrincipleContactSchema = new mongoose.Schema({
  principle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principle',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Contact name is required'],
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  designation: {
    type: String,
    maxlength: [100, 'Designation cannot be more than 100 characters']
  },
  department: {
    type: String,
    maxlength: [100, 'Department cannot be more than 100 characters']
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    maxlength: [20, 'Phone number cannot be more than 20 characters']
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PrincipleContact', PrincipleContactSchema);