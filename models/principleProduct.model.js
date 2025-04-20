const mongoose = require('mongoose');

const PrincipleProductSchema = new mongoose.Schema({
  principle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principle',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  principleProductCode: {
    type: String,
    maxlength: [100, 'Principle product code cannot be more than 100 characters']
  },
  principleProductName: {
    type: String,
    maxlength: [255, 'Principle product name cannot be more than 255 characters']
  },
  unitCost: {
    type: Number,
    min: 0
  },
  minimumOrderQuantity: {
    type: Number,
    min: 0
  },
  leadTimeDays: {
    type: Number,
    min: 0
  },
  isPreferred: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PrincipleProduct', PrincipleProductSchema);