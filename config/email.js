const nodemailer = require('nodemailer');
const Mailgen = require('mailgen');

// Configure nodemailer transport
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Configure mailgen
const mailGenerator = new Mailgen({
  theme: 'default',
  product: {
    name: process.env.EMAIL_FROM_NAME || 'Secure User Management',
    link: process.env.CLIENT_URL || 'http://localhost:3000',
    logo: 'https://via.placeholder.com/150x50?text=Logo' // Replace with your actual logo
  }
});

module.exports = {
  transporter,
  mailGenerator
};
