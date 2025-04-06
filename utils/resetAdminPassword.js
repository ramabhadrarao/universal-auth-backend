const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/user.model');

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const resetAdminPassword = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const newPassword = process.env.ADMIN_PASSWORD || 'Password123!';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const adminUser = await User.findOneAndUpdate(
      { email: adminEmail },
      { password: hashedPassword },
      { new: true }
    );

    if (!adminUser) {
      console.log('Admin user not found');
    } else {
      console.log('Admin password reset successfully');
    }

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

resetAdminPassword();