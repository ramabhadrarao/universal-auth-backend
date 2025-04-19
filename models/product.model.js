// models/product.model.js
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [255, 'Product name cannot be more than 255 characters']
  },
  productCode: {
    type: String,
    required: [true, 'Product code is required'],
    trim: true,
    maxlength: [100, 'Product code cannot be more than 100 characters'],
    unique: true
    // Removed index: true since we're using schema.index() below
  },
  principle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principle',
    required: [true, 'Principle is required']
  },
  batchNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Batch number cannot be more than 50 characters']
  },
  dpValue: {
    type: Number,
    required: [true, 'Dealer price is required'],
    min: [0, 'Price cannot be negative']
  },
  mrp: {
    type: Number,
    required: [true, 'Maximum retail price is required'],
    min: [0, 'Price cannot be negative']
  },
  expiryDate: {
    type: Date
  },
  quantity: {
    type: Number,
    default: 1,
    min: [0, 'Quantity cannot be negative']
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  specifications: [
    {
      specName: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Specification name cannot be more than 100 characters']
      },
      specValue: {
        type: String,
        required: true,
        trim: true
      },
      specUnit: {
        type: String,
        trim: true,
        maxlength: [20, 'Unit cannot be more than 20 characters']
      }
    }
  ],
  images: [
    {
      imagePath: {
        type: String,
        required: true
      },
      imageType: {
        type: String,
        enum: ['main', 'thumbnail', 'alternate'],
        default: 'main'
      },
      displayOrder: {
        type: Number,
        default: 0
      }
    }
  ],
  documents: [
    {
      documentType: {
        type: String,
        required: true
      },
      documentName: {
        type: String,
        required: true
      },
      filePath: {
        type: String,
        required: true
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true
});

// Create indexes to optimize queries
ProductSchema.index({ name: 1 });
ProductSchema.index({ productCode: 1 }); // Keep only this index definition for productCode
ProductSchema.index({ principle: 1 });
ProductSchema.index({ expiryDate: 1 });
ProductSchema.index({ isActive: 1 });

module.exports = mongoose.model('Product', ProductSchema);