// controllers/subcategory.controller.js
const Subcategory = require('../models/subcategory.model');
const Category = require('../models/category.model');
const mongoose = require('mongoose');

// @desc    Create a new subcategory
// @route   POST /api/v1/subcategories
// @access  Private
exports.createSubcategory = async (req, res) => {
  try {
    const { category, name, description, isActive } = req.body;

    // Validate category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Create the subcategory object
    const subcategoryData = {
      category,
      name,
      description,
      isActive
    };

    // Add createdBy if req.user exists
    if (req.user && req.user.id) {
      subcategoryData.createdBy = req.user.id;
    }

    // Create subcategory
    const subcategory = await Subcategory.create(subcategoryData);

    res.status(201).json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }
    
    console.error('Error in createSubcategory:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get all subcategories
// @route   GET /api/v1/subcategories
// @access  Private
exports.getAllSubcategories = async (req, res) => {
  try {
    const { category } = req.query;
    
    // Build query
    let query = {};
    
    // Filter by category if provided
    if (category) {
      query.category = category;
    }
    
    const subcategories = await Subcategory.find(query)
      .populate('category', 'name')
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      count: subcategories.length,
      data: subcategories
    });
  } catch (error) {
    console.error('Error in getAllSubcategories:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get a single subcategory
// @route   GET /api/v1/subcategories/:id
// @access  Private
exports.getSubcategory = async (req, res) => {
  try {
    const subcategory = await Subcategory.findById(req.params.id)
      .populate('category', 'name')
      .populate('createdBy', 'name');

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        error: 'Subcategory not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    console.error('Error in getSubcategory:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update subcategory
// @route   PUT /api/v1/subcategories/:id
// @access  Private
exports.updateSubcategory = async (req, res) => {
  try {
    const { category, name, description, isActive } = req.body;

    // Validate subcategory exists
    let subcategory = await Subcategory.findById(req.params.id);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        error: 'Subcategory not found'
      });
    }

    // If category is being changed, validate it exists
    if (category && category !== subcategory.category.toString()) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          error: 'Category not found'
        });
      }
    }

    // Update subcategory
    subcategory = await Subcategory.findByIdAndUpdate(
      req.params.id,
      { category, name, description, isActive },
      { new: true, runValidators: true }
    ).populate('category', 'name');

    res.status(200).json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }
    
    console.error('Error in updateSubcategory:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete subcategory
// @route   DELETE /api/v1/subcategories/:id
// @access  Private
exports.deleteSubcategory = async (req, res) => {
  try {
    const subcategory = await Subcategory.findById(req.params.id);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        error: 'Subcategory not found'
      });
    }

    await subcategory.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error in deleteSubcategory:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};