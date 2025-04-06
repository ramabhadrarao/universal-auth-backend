const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/user.model');

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const activateAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    const adminUser = await User.findOneAndUpdate(
      { email: adminEmail },
      { status: 'active', isEmailVerified: true },
      { new: true }
    );

    if (!adminUser) {
      console.log('Admin user not found');
    } else {
      console.log('Admin account activated successfully');
    }

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

activateAdmin();