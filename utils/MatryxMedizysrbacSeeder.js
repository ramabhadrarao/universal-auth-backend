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
const Category = require('../models/category.model');

// Connect to DB
mongoose.connect(process.env.MONGO_URI);

// System-wide permissions (existing ones from original seeder)
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

// New module-specific permissions based on Matryx Medizys documentation
const matrysPermissions = [
  // Department Module
  {
    name: 'Manage Departments',
    description: 'Full access to department management',
    resource: 'departments',
    action: 'manage',
    isSystem: true
  },
  {
    name: 'Read Departments',
    description: 'View department information',
    resource: 'departments',
    action: 'read',
    isSystem: true
  },
  {
    name: 'Create Departments',
    description: 'Create new departments',
    resource: 'departments',
    action: 'create',
    isSystem: true
  },
  {
    name: 'Update Departments',
    description: 'Update department information',
    resource: 'departments',
    action: 'update',
    isSystem: true
  },
  {
    name: 'Delete Departments',
    description: 'Delete departments',
    resource: 'departments',
    action: 'delete',
    isSystem: true
  },
  
  // Products Module
  {
    name: 'Manage Products',
    description: 'Full access to product management',
    resource: 'products',
    action: 'manage',
    isSystem: true
  },
  {
    name: 'Read Products',
    description: 'View product information',
    resource: 'products',
    action: 'read',
    isSystem: true
  },
  {
    name: 'Create Products',
    description: 'Create new products',
    resource: 'products',
    action: 'create',
    isSystem: true
  },
  {
    name: 'Update Products',
    description: 'Update product information',
    resource: 'products',
    action: 'update',
    isSystem: true
  },
  {
    name: 'Delete Products',
    description: 'Delete products',
    resource: 'products',
    action: 'delete',
    isSystem: true
  },
  
  // Categories Module
  {
    name: 'Manage Categories',
    description: 'Full access to category management',
    resource: 'categories',
    action: 'manage',
    isSystem: true
  },
  {
    name: 'Read Categories',
    description: 'View category information',
    resource: 'categories',
    action: 'read',
    isSystem: true
  },
  {
    name: 'Create Categories',
    description: 'Create new categories',
    resource: 'categories',
    action: 'create',
    isSystem: true
  },
  {
    name: 'Update Categories',
    description: 'Update category information',
    resource: 'categories',
    action: 'update',
    isSystem: true
  },
  {
    name: 'Delete Categories',
    description: 'Delete categories',
    resource: 'categories',
    action: 'delete',
    isSystem: true
  },
  
  // Subcategories resource
  {
    name: 'Manage Subcategories',
    description: 'Full access to subcategory management',
    resource: 'subcategories',
    action: 'manage',
    isSystem: true
  },
  {
    name: 'Read Subcategories',
    description: 'View subcategory information',
    resource: 'subcategories',
    action: 'read',
    isSystem: true
  },
  {
    name: 'Create Subcategories',
    description: 'Create new subcategories',
    resource: 'subcategories',
    action: 'create',
    isSystem: true
  },
  {
    name: 'Update Subcategories',
    description: 'Update subcategory information',
    resource: 'subcategories',
    action: 'update',
    isSystem: true
  },
  {
    name: 'Delete Subcategories',
    description: 'Delete subcategories',
    resource: 'subcategories',
    action: 'delete',
    isSystem: true
  },
  
  // Principals/Suppliers Module
  {
    name: 'Manage Principles',
    description: 'Full access to principle management',
    resource: 'principles',
    action: 'manage',
    isSystem: true
  },
  {
    name: 'Read Principles',
    description: 'View principle information',
    resource: 'principles',
    action: 'read',
    isSystem: true
  },
  {
    name: 'Create Principles',
    description: 'Create new principles',
    resource: 'principles',
    action: 'create',
    isSystem: true
  },
  {
    name: 'Update Principles',
    description: 'Update principle information',
    resource: 'principles',
    action: 'update',
    isSystem: true
  },
  {
    name: 'Delete Principles',
    description: 'Delete principles',
    resource: 'principles',
    action: 'delete',
    isSystem: true
  },
  
  // Doctors Module
  {
    name: 'Manage Doctors',
    description: 'Full access to doctor management',
    resource: 'doctors',
    action: 'manage',
    isSystem: true
  },
  {
    name: 'Read Doctors',
    description: 'View doctor information',
    resource: 'doctors',
    action: 'read',
    isSystem: true
  },
  {
    name: 'Create Doctors',
    description: 'Create new doctors',
    resource: 'doctors',
    action: 'create',
    isSystem: true
  },
  {
    name: 'Update Doctors',
    description: 'Update doctor information',
    resource: 'doctors',
    action: 'update',
    isSystem: true
  },
  {
    name: 'Delete Doctors',
    description: 'Delete doctors',
    resource: 'doctors',
    action: 'delete',
    isSystem: true
  },
  
  // Hospitals Module
  {
    name: 'Manage Hospitals',
    description: 'Full access to hospital management',
    resource: 'hospitals',
    action: 'manage',
    isSystem: true
  },
  {
    name: 'Read Hospitals',
    description: 'View hospital information',
    resource: 'hospitals',
    action: 'read',
    isSystem: true
  },
  {
    name: 'Create Hospitals',
    description: 'Create new hospitals',
    resource: 'hospitals',
    action: 'create',
    isSystem: true
  },
  {
    name: 'Update Hospitals',
    description: 'Update hospital information',
    resource: 'hospitals',
    action: 'update',
    isSystem: true
  },
  {
    name: 'Delete Hospitals',
    description: 'Delete hospitals',
    resource: 'hospitals',
    action: 'delete',
    isSystem: true
  },
  
  // Cases Module
  {
    name: 'Manage Cases',
    description: 'Full access to case management',
    resource: 'cases',
    action: 'manage',
    isSystem: true
  },
  {
    name: 'Read Cases',
    description: 'View case information',
    resource: 'cases',
    action: 'read',
    isSystem: true
  },
  {
    name: 'Create Cases',
    description: 'Create new cases',
    resource: 'cases',
    action: 'create',
    isSystem: true
  },
  {
    name: 'Update Cases',
    description: 'Update case information',
    resource: 'cases',
    action: 'update',
    isSystem: true
  },
  {
    name: 'Delete Cases',
    description: 'Delete cases',
    resource: 'cases',
    action: 'delete',
    isSystem: true
  },
  
  // Inventory Module
  {
    name: 'Manage Inventory',
    description: 'Full access to inventory management',
    resource: 'inventory',
    action: 'manage',
    isSystem: true
  },
  {
    name: 'Read Inventory',
    description: 'View inventory information',
    resource: 'inventory',
    action: 'read',
    isSystem: true
  },
  {
    name: 'Create Inventory',
    description: 'Add inventory items',
    resource: 'inventory',
    action: 'create',
    isSystem: true
  },
  {
    name: 'Update Inventory',
    description: 'Update inventory information',
    resource: 'inventory',
    action: 'update',
    isSystem: true
  },
  {
    name: 'Delete Inventory',
    description: 'Remove inventory items',
    resource: 'inventory',
    action: 'delete',
    isSystem: true
  },
  
  // Reports Module
  {
    name: 'Access Reports',
    description: 'View system reports',
    resource: 'reports',
    action: 'read',
    isSystem: true
  },
  {
    name: 'Manage Reports',
    description: 'Full access to reports including export',
    resource: 'reports',
    action: 'manage',
    isSystem: true
  }
];

// Combine all permissions
const allPermissions = [...systemPermissions, ...matrysPermissions];

// Enhanced system roles based on Matryx Medizys documentation
const matrysRoles = [
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
    name: 'sales_manager',
    description: 'Sales department manager with access to all sales and customer data',
    isSystem: true,
    permissions: [] // Will be filled with specific permissions
  },
  {
    name: 'sales_representative',
    description: 'Sales team member with customer interaction abilities',
    isSystem: true,
    permissions: [] // Will be filled with specific permissions
  },
  {
    name: 'inventory_manager',
    description: 'Manages product inventory and supply chain',
    isSystem: true,
    permissions: [] // Will be filled with specific permissions
  },
  {
    name: 'product_specialist',
    description: 'Handles product information and specifications',
    isSystem: true,
    permissions: [] // Will be filled with specific permissions
  },
  {
    name: 'hospital_coordinator',
    description: 'Manages hospital relationships and requirements',
    isSystem: true,
    permissions: [] // Will be filled with specific permissions
  },
  {
    name: 'doctor_liaison',
    description: 'Manages doctor relationships and preferences',
    isSystem: true,
    permissions: [] // Will be filled with specific permissions
  },
  {
    name: 'finance_user',
    description: 'Has access to financial reports and data',
    isSystem: true,
    permissions: [] // Will be filled with specific permissions
  },
  {
    name: 'report_viewer',
    description: 'Can only view reports and dashboards',
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

// Create some default category data for initialization
const initialCategories = [
  {
    name: 'Surgical Instruments',
    description: 'Tools and devices used during surgical procedures',
    isActive: true
  },
  {
    name: 'Implants',
    description: 'Medical devices used to replace or support damaged body structures',
    isActive: true
  },
  {
    name: 'Disposables',
    description: 'Single-use medical supplies',
    isActive: true
  },
  {
    name: 'Monitoring Equipment',
    description: 'Devices for patient monitoring',
    isActive: true
  },
  {
    name: 'Sterilization Products',
    description: 'Equipment and supplies for sterilizing medical instruments',
    isActive: true
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
    await Category.deleteMany();

    console.log('Data cleared...');

    // Create permissions
    const createdPermissions = await Permission.create(allPermissions);
    console.log(`${createdPermissions.length} permissions created`);

    // Create permission map for easy reference
    const permissionMap = {};
    createdPermissions.forEach(permission => {
      permissionMap[`${permission.resource}:${permission.action}`] = permission._id;
    });

    // Assign permissions to roles based on role functions
    const rolesToCreate = matrysRoles.map(role => {
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

      // Sales Manager
      if (role.name === 'sales_manager') {
        // User management for their team
        rolePermissions.push(permissionMap['users:read']);
        // Sales related permissions
        rolePermissions.push(permissionMap['cases:manage']);
        rolePermissions.push(permissionMap['hospitals:manage']);
        rolePermissions.push(permissionMap['doctors:manage']);
        // Read access to products, inventory
        rolePermissions.push(permissionMap['products:read']);
        rolePermissions.push(permissionMap['categories:read']);
        rolePermissions.push(permissionMap['subcategories:read']);
        rolePermissions.push(permissionMap['inventory:read']);
        // Department permissions
        rolePermissions.push(permissionMap['departments:read']);
        // Reports
        rolePermissions.push(permissionMap['reports:read']);
        rolePermissions.push(permissionMap['reports:manage']);
        // Profile
        rolePermissions.push(permissionMap['profile:manage']);
      }

      // Sales Representative
      if (role.name === 'sales_representative') {
        // Case management
        rolePermissions.push(permissionMap['cases:create']);
        rolePermissions.push(permissionMap['cases:read']);
        rolePermissions.push(permissionMap['cases:update']);
        // Customer management
        rolePermissions.push(permissionMap['hospitals:read']);
        rolePermissions.push(permissionMap['doctors:read']);
        // Read product information
        rolePermissions.push(permissionMap['products:read']);
        rolePermissions.push(permissionMap['categories:read']);
        rolePermissions.push(permissionMap['subcategories:read']);
        rolePermissions.push(permissionMap['inventory:read']);
        // Profile
        rolePermissions.push(permissionMap['profile:manage']);
      }

      // Inventory Manager
      if (role.name === 'inventory_manager') {
        // Inventory permissions
        rolePermissions.push(permissionMap['inventory:manage']);
        // Product related permissions
        rolePermissions.push(permissionMap['products:read']);
        rolePermissions.push(permissionMap['products:update']);
        // Category access
        rolePermissions.push(permissionMap['categories:read']);
        rolePermissions.push(permissionMap['subcategories:read']);
        // Supplier access
        rolePermissions.push(permissionMap['principles:read']);
        // Reports
        rolePermissions.push(permissionMap['reports:read']);
        // Profile
        rolePermissions.push(permissionMap['profile:manage']);
      }

      // Product Specialist
      if (role.name === 'product_specialist') {
        // Product permissions
        rolePermissions.push(permissionMap['products:manage']);
        // Category and specifications
        rolePermissions.push(permissionMap['categories:read']);
        rolePermissions.push(permissionMap['subcategories:read']);
        // Read inventory
        rolePermissions.push(permissionMap['inventory:read']);
        // Supplier information
        rolePermissions.push(permissionMap['principles:read']);
        // Profile
        rolePermissions.push(permissionMap['profile:manage']);
      }

      // Hospital Coordinator
      if (role.name === 'hospital_coordinator') {
        // Hospital permissions
        rolePermissions.push(permissionMap['hospitals:manage']);
        // Case access
        rolePermissions.push(permissionMap['cases:read']);
        // Product information
        rolePermissions.push(permissionMap['products:read']);
        rolePermissions.push(permissionMap['categories:read']);
        rolePermissions.push(permissionMap['subcategories:read']);
        // Profile
        rolePermissions.push(permissionMap['profile:manage']);
      }

      // Doctor Liaison
      if (role.name === 'doctor_liaison') {
        // Doctor permissions
        rolePermissions.push(permissionMap['doctors:manage']);
        // Case access
        rolePermissions.push(permissionMap['cases:read']);
        // Product information
        rolePermissions.push(permissionMap['products:read']);
        rolePermissions.push(permissionMap['categories:read']);
        rolePermissions.push(permissionMap['subcategories:read']);
        // Profile
        rolePermissions.push(permissionMap['profile:manage']);
      }

      // Finance User
      if (role.name === 'finance_user') {
        // Reports access
        rolePermissions.push(permissionMap['reports:read']);
        rolePermissions.push(permissionMap['reports:manage']);
        // Read access to all data for financial analysis
        rolePermissions.push(permissionMap['cases:read']);
        rolePermissions.push(permissionMap['products:read']);
        rolePermissions.push(permissionMap['inventory:read']);
        rolePermissions.push(permissionMap['hospitals:read']);
        rolePermissions.push(permissionMap['doctors:read']);
        // Profile
        rolePermissions.push(permissionMap['profile:manage']);
      }

      // Report Viewer
      if (role.name === 'report_viewer') {
        // Reports access only
        rolePermissions.push(permissionMap['reports:read']);
        // Profile
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

    // Create initial categories
    const createdCategories = await Category.create(initialCategories);
    console.log(`${createdCategories.length} categories created`);

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
    await Category.deleteMany();

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