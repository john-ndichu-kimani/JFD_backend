import { Request, Response, NextFunction } from 'express';
import { ValidationError, Result } from 'express-validator';

// Custom error class
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  errors?: Record<string, string[]>;

  constructor(message: string, statusCode: number, errors?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Type guard for express-validator errors
function isExpressValidatorError(err: any): err is Result<ValidationError> {
  return Array.isArray(err?.array);
}

// Global error handler
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging
  console.error('ERROR 💥', err);

  // Handle express-validator errors
  if (isExpressValidatorError(err)) {
    const errors = err.array().reduce((acc: Record<string, string[]>, error) => {
      const param = error.type === 'field' ? error.path : error.type;
      if (!acc[param]) {
        acc[param] = [];
      }
      acc[param].push(error.msg);
      return acc;
    }, {});

    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    const validationError = err as any;
    const errors = validationError.errors 
      ? Object.keys(validationError.errors).reduce((acc: Record<string, string[]>, key) => {
          acc[key] = [validationError.errors[key].message];
          return acc;
        }, {})
      : undefined;

    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
  }

  // Handle Prisma errors
  if ((err as any).code === 'P2002') {
    err = new AppError('A record with that value already exists', 409);
  }

  if ((err as any).code === 'P2025') {
    err = new AppError('Record not found', 404);
  }

  // Send response
  const statusCode = (err as AppError).statusCode || 500;
  const message = err.message || 'Something went wrong';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      ...((err as AppError).errors && { errors: (err as AppError).errors })
    }),
  });
};

// Not found handler
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Not found - ${req.originalUrl}`, 404));
};

// Async handler to avoid try-catch blocks
export const asyncHandler = <T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};