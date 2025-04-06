const User = require('../models/user.model');
const UserRole = require('../models/userRole.model');
const Role = require('../models/role.model');
const ErrorResponse = require('../utils/errorResponse');
const { logger } = require('../middlewares/logger.middleware');

/**
 * @desc    Get all users
 * @route   GET /api/v1/users
 * @access  Private/Admin
 */
exports.getUsers = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Filtering
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Execute query
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // Get roles for each user
    const usersWithRoles = await Promise.all(
      users.map(async user => {
        const userRoles = await UserRole.find({ user: user._id })
          .populate('role')
          .select('role');

        const roles = userRoles.map(userRole => userRole.role.name);

        return {
          ...user.toObject(),
          roles
        };
      })
    );

    // Pagination result
    const pagination = {};
    if (startIndex + users.length < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pagination,
      data: usersWithRoles
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single user
 * @route   GET /api/v1/users/:id
 * @access  Private/Admin
 */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // Get user roles
    const userRoles = await UserRole.find({ user: user._id })
      .populate('role')
      .select('role');

    const roles = userRoles.map(userRole => userRole.role.name);

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        roles
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create user
 * @route   POST /api/v1/users
 * @access  Private/Admin
 */
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, status, roles } = req.body;

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      status: status || 'pending'
    });

    // Assign roles if provided
    if (roles && roles.length > 0) {
      for (const roleName of roles) {
        const role = await Role.findOne({ name: roleName });
        if (role) {
          await UserRole.create({
            user: user._id,
            role: role._id,
            assignedBy: req.user.id
          });
        } else {
          logger.warn(`Role ${roleName} not found when creating user ${user._id}`);
        }
      }
    } else {
      // Assign default user role
      const defaultRole = await Role.findOne({ name: 'user' });
      if (defaultRole) {
        await UserRole.create({
          user: user._id,
          role: defaultRole._id,
          assignedBy: req.user.id
        });
      } else {
        logger.error('Default user role not found');
        return next(new ErrorResponse('Error in user setup, please contact administrator', 500));
      }
    }

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/v1/users/:id
 * @access  Private/Admin
 */
exports.updateUser = async (req, res, next) => {
  try {
    // Remove fields that shouldn't be updated directly
    const fieldsToUpdate = { ...req.body };
    delete fieldsToUpdate.password; // Don't update password this way
    delete fieldsToUpdate.roles; // Handle roles separately

    // Find user
    let user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // Update user
    user = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    // Update roles if provided
    if (req.body.roles && Array.isArray(req.body.roles)) {
      // First, remove all existing roles
      await UserRole.deleteMany({ user: user._id });

      // Then add new roles
      for (const roleName of req.body.roles) {
        const role = await Role.findOne({ name: roleName });
        if (role) {
          await UserRole.create({
            user: user._id,
            role: role._id,
            assignedBy: req.user.id
          });
        } else {
          logger.warn(`Role ${roleName} not found when updating user ${user._id}`);
        }
      }
    }

    // Get updated user with roles
    const userRoles = await UserRole.find({ user: user._id })
      .populate('role')
      .select('role');

    const roles = userRoles.map(userRole => userRole.role.name);

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        roles
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if the user is an admin
    const userRoles = await UserRole.find({ user: user._id }).populate('role');
    const isAdmin = userRoles.some(ur => ur.role.name === 'admin');

    // Prevent deleting admin users for safety
    if (isAdmin && user._id.toString() !== req.user.id.toString()) {
      return next(
        new ErrorResponse('Cannot delete admin users', 403)
      );
    }

    // Delete user roles first
    await UserRole.deleteMany({ user: user._id });

    // Then delete the user
    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user status
 * @route   PUT /api/v1/users/:id/status
 * @access  Private/Admin
 */
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['pending', 'active', 'suspended', 'rejected'].includes(status)) {
      return next(new ErrorResponse('Invalid status value', 400));
    }

    // Find and update user
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get users count by status
 * @route   GET /api/v1/users/stats
 * @access  Private/Admin
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Transform to object
    const statsObj = {};
    stats.forEach(item => {
      statsObj[item._id] = item.count;
    });

    // Get total count
    const total = await User.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        total,
        ...statsObj
      }
    });
  } catch (err) {
    next(err);
  }
};
