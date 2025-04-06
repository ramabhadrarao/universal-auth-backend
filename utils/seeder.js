const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load env vars
dotenv.config();

// Load models
const User = require('../models/user.model');
const Role = require('../models/role.model');
const Permission = require('../models/permission.model');
const UserRole = require('../models/userRole.model');

// Connect to DB
mongoose.connect(process.env.MONGO_URI);

// Default system permissions
const systemPermissions = [
  // Users resource
  {
    name: 'Manage Users',
    description: 'Full access to user management',
    resource: 'users',
    action: 'manage',
    isSystem: true
  },
  {
    name: 'Read Users',
    description: 'View user information',
    resource: 'users',
    action: 'read',
    isSystem: true
  },
  {
    name: 'Create Users',
    description: 'Create new users',
    resource: 'users',
    action: 'create',
    isSystem: true
  },
  {
    name: 'Update Users',
    description: 'Update user information',
    resource: 'users',
    action: 'update',
    isSystem: true
  },
  {
    name: 'Delete Users',
    description: 'Delete users',
    resource: 'users',
    action: 'delete',
    isSystem: true
  },
  
  // Roles resource
  {
    name: 'Manage Roles',
    description: 'Full access to role management',
    resource: 'roles',
    action: 'manage',
    isSystem: true
  },
  {
    name: 'Read Roles',
    description: 'View role information',
    resource: 'roles',
    action: 'read',
    isSystem: true
  },
  
  // Permissions resource
  {
    name: 'Manage Permissions',
    description: 'Full access to permission management',
    resource: 'permissions',
    action: 'manage',
    isSystem: true
  },
  {
    name: 'Read Permissions',
    description: 'View permission information',
    resource: 'permissions',
    action: 'read',
    isSystem: true
  },
  
  // Profile resource (user's own profile)
  {
    name: 'Manage Own Profile',
    description: 'Manage own profile information',
    resource: 'profile',
    action: 'manage',
    isSystem: true
  }
];

// Default system roles
const systemRoles = [
  {
    name: 'admin',
    description: 'System administrator with full access',
    isSystem: true,
    permissions: [] // Will be filled with all permissions
  },
  {
    name: 'moderator',
    description: 'Can manage users but has limited system access',
    isSystem: true,
    permissions: [] // Will be filled with specific permissions
  },
  {
    name: 'user',
    description: 'Regular user with limited access',
    isSystem: true,
    permissions: [] // Will be filled with specific permissions
  }
];

// Default admin user
const defaultAdmin = {
  name: process.env.ADMIN_NAME || 'Admin User',
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'Password123!',
  status: 'active',
  isEmailVerified: true
};

// Import data into DB
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Role.deleteMany();
    await Permission.deleteMany();
    await UserRole.deleteMany();

    console.log('Data cleared...');

    // Create permissions
    const createdPermissions = await Permission.create(systemPermissions);
    console.log(`${createdPermissions.length} permissions created`);

    // Create permission map for easy reference
    const permissionMap = {};
    createdPermissions.forEach(permission => {
      permissionMap[`${permission.resource}:${permission.action}`] = permission._id;
    });

    // Assign permissions to roles
    const rolesToCreate = systemRoles.map(role => {
      const rolePermissions = [];
      
      // Admin gets all permissions
      if (role.name === 'admin') {
        rolePermissions.push(...createdPermissions.map(p => p._id));
      }
      
      // Moderator gets user management and own profile
      if (role.name === 'moderator') {
        rolePermissions.push(permissionMap['users:read']);
        rolePermissions.push(permissionMap['users:update']);
        rolePermissions.push(permissionMap['roles:read']);
        rolePermissions.push(permissionMap['permissions:read']);
        rolePermissions.push(permissionMap['profile:manage']);
      }
      
      // Regular user only gets profile management
      if (role.name === 'user') {
        rolePermissions.push(permissionMap['profile:manage']);
      }
      
      return {
        ...role,
        permissions: rolePermissions
      };
    });

    // Create roles
    const createdRoles = await Role.create(rolesToCreate);
    console.log(`${createdRoles.length} roles created`);

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, salt);
    
    const adminUser = await User.create({
      ...defaultAdmin,
      password: hashedPassword
    });
    console.log('Admin user created');

    // Assign admin role to admin user
    const adminRole = createdRoles.find(role => role.name === 'admin');
    await UserRole.create({
      user: adminUser._id,
      role: adminRole._id
    });
    console.log('Admin role assigned to admin user');

    console.log('Data imported successfully!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Delete data from DB
const deleteData = async () => {
  try {
    await User.deleteMany();
    await Role.deleteMany();
    await Permission.deleteMany();
    await UserRole.deleteMany();

    console.log('Data destroyed...');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Process command line args
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Please use -i to import or -d to delete data');
  process.exit();
}
