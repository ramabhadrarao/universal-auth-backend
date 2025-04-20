const mongoose = require('mongoose');

const PrincipleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Principle name is required'],
    trim: true,
    maxlength: [255, 'Name cannot be more than 255 characters']
  },
  contactPerson: {
    type: String,
    maxlength: [100, 'Contact person name cannot be more than 100 characters']
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
  address: String,
  website: {
    type: String,
    maxlength: [255, 'Website URL cannot be more than 255 characters']
  },
  gstNumber: {
    type: String,
    maxlength: [20, 'GST number cannot be more than 20 characters']
  },
  paymentTerms: {
    type: String,
    maxlength: [100, 'Payment terms cannot be more than 100 characters']
  },
  creditDays: Number,
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Principle', PrincipleSchema);