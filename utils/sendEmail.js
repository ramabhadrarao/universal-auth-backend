const { transporter, mailGenerator } = require('../config/email');
const { logger } = require('../middlewares/logger.middleware');

/**
 * Send email using nodemailer and mailgen
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template type ('welcome', 'passwordReset', etc.)
 * @param {Object} options.data - Data for template
 * @returns {Promise<Object>} - Nodemailer response
 */
const sendEmail = async (options) => {
  try {
    const { to, subject, template, data } = options;

    // Generate email content based on template
    let emailContent;

    switch (template) {
      case 'welcome':
        emailContent = mailGenerator.generate({
          body: {
            name: data.name || 'Valued User',
            intro: `Welcome to ${process.env.EMAIL_FROM_NAME || 'Our Service'}! We're very excited to have you on board.`,
            action: {
              instructions: 'To get started with our service, please click the button below:',
              button: {
                color: '#22BC66', // Green button
                text: 'Get Started',
                link: data.actionUrl || process.env.CLIENT_URL
              }
            },
            outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
          }
        });
        break;

      case 'passwordReset':
        emailContent = mailGenerator.generate({
          body: {
            name: data.name || 'Valued User',
            intro: 'You have received this email because a password reset request for your account was received.',
            action: {
              instructions: 'Click the button below to reset your password:',
              button: {
                color: '#DC4D2F', // Red button
                text: 'Reset Password',
                link: data.resetUrl
              }
            },
            outro: 'If you did not request a password reset, no further action is required on your part.'
          }
        });
        break;

      case 'emailVerification':
        emailContent = mailGenerator.generate({
          body: {
            name: data.name || 'Valued User',
            intro: 'Welcome! Please verify your email address to complete your registration.',
            action: {
              instructions: 'Click the button below to verify your email:',
              button: {
                color: '#3869D4', // Blue button
                text: 'Verify Email',
                link: data.verificationUrl
              }
            },
            outro: 'If you did not create an account, no further action is required.'
          }
        });
        break;

      case 'accountActivated':
        emailContent = mailGenerator.generate({
          body: {
            name: data.name || 'Valued User',
            intro: 'Good news! Your account has been activated.',
            action: {
              instructions: 'Click the button below to log in:',
              button: {
                color: '#22BC66', // Green button
                text: 'Log In',
                link: `${process.env.CLIENT_URL}/login`
              }
            },
            outro: 'Thank you for choosing our service. We hope you enjoy it!'
          }
        });
        break;

      case 'custom':
        emailContent = mailGenerator.generate({
          body: {
            name: data.name || 'Valued User',
            intro: data.intro || 'Hello!',
            action: data.action ? {
              instructions: data.action.instructions || '',
              button: {
                color: data.action.color || '#3869D4',
                text: data.action.text || 'Click Here',
                link: data.action.link || process.env.CLIENT_URL
              }
            } : null,
            outro: data.outro || ''
          }
        });
        break;

      default:
        // Generic email
        emailContent = mailGenerator.generate({
          body: {
            name: data.name || 'Valued User',
            intro: data.intro || 'Hello from our service!',
            outro: data.outro || 'If you have any questions, please don\'t hesitate to reach out to us.'
          }
        });
    }

    // Setup email data
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html: emailContent
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    
    return info;
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
    throw error;
  }
};

module.exports = sendEmail;
