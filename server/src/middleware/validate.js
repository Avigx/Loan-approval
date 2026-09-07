/**
 * Generic Zod validation middleware.
 * Usage: router.post('/route', validate(myZodSchema), controller.handler)
 *
 * Validates req.body against the provided Zod schema.
 * On failure, passes a ZodError to the error handler.
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error); // ZodError → handled by errorHandler.js
    }
  };
};

/**
 * Validates req.query against the provided Zod schema.
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { validate, validateQuery };
