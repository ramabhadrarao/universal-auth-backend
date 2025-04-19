/**
 * Middleware to validate request data using Joi schemas
 * @param {Object} schema - Joi schema to validate against
 * @returns {Function} - Express middleware function
 */
const validateRequest = (schema) => {
    return (req, res, next) => {
      if (!schema) return next();
  
      const { error } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
  
      if (error) {
        const errorMessage = error.details
          .map(detail => detail.message)
          .join(', ');
        
        return res.status(400).json({
          success: false,
          error: errorMessage
        });
      }
  
      next();
    };
  };
  
  module.exports = validateRequest;