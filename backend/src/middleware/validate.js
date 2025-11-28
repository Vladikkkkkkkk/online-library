const ApiError = require('../utils/ApiError');

/**
 * Simple validation middleware
 * @param {object} schema - Validation schema with rules
 */
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    // Validate body
    if (schema.body) {
      const bodyErrors = validateObject(req.body, schema.body, 'body');
      errors.push(...bodyErrors);
    }

    // Validate query
    if (schema.query) {
      const queryErrors = validateObject(req.query, schema.query, 'query');
      errors.push(...queryErrors);
    }

    // Validate params
    if (schema.params) {
      const paramsErrors = validateObject(req.params, schema.params, 'params');
      errors.push(...paramsErrors);
    }

    if (errors.length > 0) {
      return next(ApiError.badRequest(errors.join(', ')));
    }

    next();
  };
};

/**
 * Validate object against rules
 */
const validateObject = (obj, rules, location) => {
  const errors = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = obj[field];

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${location}.${field} is required`);
      continue;
    }

    // Skip further validation if value is not present and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type check
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (rule.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`${location}.${field} must be a valid email`);
        }
      } else if (rule.type !== actualType) {
        errors.push(`${location}.${field} must be of type ${rule.type}`);
      }
    }

    // Min length check (for strings)
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      errors.push(`${location}.${field} must be at least ${rule.minLength} characters`);
    }

    // Max length check (for strings)
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      errors.push(`${location}.${field} must be at most ${rule.maxLength} characters`);
    }

    // Min value check (for numbers)
    if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
      errors.push(`${location}.${field} must be at least ${rule.min}`);
    }

    // Max value check (for numbers)
    if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
      errors.push(`${location}.${field} must be at most ${rule.max}`);
    }

    // Enum check
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${location}.${field} must be one of: ${rule.enum.join(', ')}`);
    }

    // Pattern check
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${location}.${field} format is invalid`);
    }
  }

  return errors;
};

// Common validation schemas
const schemas = {
  // Auth schemas
  register: {
    body: {
      email: { required: true, type: 'email' },
      password: { required: true, type: 'string', minLength: 6 },
      firstName: { required: true, type: 'string', minLength: 2 },
      lastName: { required: true, type: 'string', minLength: 2 },
    },
  },
  login: {
    body: {
      email: { required: true, type: 'email' },
      password: { required: true, type: 'string' },
    },
  },
  updateProfile: {
    body: {
      firstName: { type: 'string', minLength: 2 },
      lastName: { type: 'string', minLength: 2 },
    },
  },
  changePassword: {
    body: {
      currentPassword: { required: true, type: 'string' },
      newPassword: { required: true, type: 'string', minLength: 6 },
    },
  },

  // Book schemas
  createBook: {
    body: {
      title: { required: true, type: 'string', minLength: 1 },
      description: { type: 'string' },
      isbn: { type: 'string' },
      publishYear: { type: 'number', min: 1000, max: new Date().getFullYear() },
      language: { type: 'string' },
    },
  },
  
  // Pagination schema
  pagination: {
    query: {
      page: { type: 'string' },
      limit: { type: 'string' },
    },
  },

  // ID param schema
  idParam: {
    params: {
      id: { required: true, type: 'string' },
    },
  },
};

module.exports = { validate, schemas };

